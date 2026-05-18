import express from "express";
import cors from "cors";
import routes from "./routes.js";
import path from "path";
import authRoutes from "./authRoutes.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ccass-prototype.kaleyra.dev",
    "https://inmmui.orchestrate.tatacommunicationsdigo.io",
    "http://10.64.9.213:5173",
          "https://inmmui.orchestrate.tatacommunicationsdigo.io/webhook/d542aead-cadb-49e0-b757-a4e4bcd054bf",
          "https://inmmui.orchestrate.tatacommunicationsdigo.io",
          "http://10.64.9.213:5173/SDD_1/"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "appkey"
  ],
  credentials: true,
}));

app.use(express.json());

app.use("/api", routes);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
