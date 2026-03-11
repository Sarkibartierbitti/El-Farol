export var GameStatus;
(function (GameStatus) {
    GameStatus["DRAFT"] = "draft";
    GameStatus["RUNNING"] = "running";
    GameStatus["PAUSED"] = "paused";
    GameStatus["COMPLETED"] = "completed";
    GameStatus["CANCELLED"] = "cancelled";
})(GameStatus || (GameStatus = {}));
