"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ads_1 = __importDefault(require("./routes/ads"));
const adsRepo_1 = require("./adsRepo");
const app = (0, express_1.default)();
app.use(express_1.default.json());
const port = process.env.PORT || 4003;
// Simple middleware for now
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});
(0, adsRepo_1.initAdsTable)();
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.use('/', ads_1.default);
app.listen(port, () => {
    console.log(`advertisement-service listening on ${port}`);
});
exports.default = app;
