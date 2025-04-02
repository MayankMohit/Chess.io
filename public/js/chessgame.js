const socket = io();

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const turnIndicator = document.querySelector(".player");

const updatePlayer = () => {
    turnIndicator.innerText = chess.turn() === "w" ? "White's Turn" : "Black's Turn";
};

updatePlayer()
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastTouchedSquare = null;
let started = false


const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) { 
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", 
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color && playerRole === chess.turn();
                console.log("Player Role:", playerRole);
                console.log("Board flipped:", boardElement.classList.contains("flipped"));

                if ('ontouchstart' in window) {
                    // Mobile Dragging
                    pieceElement.addEventListener("touchstart", (e) => {
                        if (square.color !== chess.turn() || playerRole !== chess.turn()) return;
                        if (pieceElement.draggable) {
                            draggedPiece = pieceElement;
                            sourceSquare = { row: rowIndex, col: squareIndex };
                            e.preventDefault();
                        } else {
                            return
                        }
                    });

                    pieceElement.addEventListener("touchmove", (e) => {
                        e.preventDefault();
                        if (!draggedPiece) return;

                        const touch = e.touches[0];

                        // Detect the target square
                        const targetSquare = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (targetSquare && targetSquare.classList.contains("square")) {
                            lastTouchedSquare = {
                                row: parseInt(targetSquare.dataset.row),
                                col: parseInt(targetSquare.dataset.col)
                            };
                        }
                    });

                    pieceElement.addEventListener("touchend", () => {  
                        if (draggedPiece) {
                            if (lastTouchedSquare) {
                                handleMove(sourceSquare, lastTouchedSquare);
                            }
                        }

                        draggedPiece = null;
                        sourceSquare = null;
                        lastTouchedSquare = null;
                    });

                } else {
                    // PC Dragging
                    pieceElement.addEventListener("dragstart", (e) => {
                        if (square.color !== chess.turn() || playerRole !== chess.turn()) return;

                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };

                        e.dataTransfer.setData("text/plain", "");
                        pieceElement.style.transform = "scale(1.2)";
                        pieceElement.style.boxShadow = "0px 5px 15px rgba(0,0,0,0.3)";
                    });

                    pieceElement.addEventListener("dragend", () => {   
                        if (draggedPiece) {
                            draggedPiece.style.transform = "scale(1)";
                            draggedPiece.style.boxShadow = "none";
                        }
                        draggedPiece = null;
                        sourceSquare = null;
                    });

                }
                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => e.preventDefault());
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    if (!started) {
        if (playerRole === "b") {
            boardElement.classList.add("flipped");
        } else {
            boardElement.classList.remove("flipped");
        }
    }
    
};

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q"
    };
    started = true
    socket.emit("move", move);
    renderBoard()
};

const getPieceUnicode = (piece) => {
    const type = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();

    const unicodePieces = {
        p: "♟",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
        P: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔"
    };
    return unicodePieces[type] || "";
};

socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    updatePlayer();
    renderBoard();
});

renderBoard();

