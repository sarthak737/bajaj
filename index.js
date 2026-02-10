import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const EMAIL = process.env.OFFICIAL_EMAIL;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const fibonacci = (n) => {
  if (!Number.isInteger(n) || n < 0) return [];
  const res = [];
  let a = 0,
    b = 1;
  for (let i = 0; i < n; i++) {
    res.push(a);
    [a, b] = [b, a + b];
  }
  return res;
};

const isPrime = (n) => {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
};

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  return b === 0 ? a : gcd(b, a % b);
};

const lcm = (a, b) => {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
};

app.get("/health", (req, res) => {
  return res.status(200).json({
    is_success: true,
    official_email: EMAIL,
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;

    const keys = Object.keys(body);
    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        official_email: EMAIL,
        message: "Exactly one key is allowed",
      });
    }

    const key = keys[0];
    let result;

    if (key === "fibonacci") {
      result = fibonacci(Number(body.fibonacci));
    } else if (key === "prime" && Array.isArray(body.prime)) {
      result = body.prime.map(Number).filter(Number.isInteger).filter(isPrime);
    } else if (key === "lcm" && Array.isArray(body.lcm)) {
      const nums = body.lcm.map(Number).filter(Number.isInteger);
      result = nums.reduce((acc, val) => lcm(acc, val), nums[0] || 0);
    } else if (key === "hcf" && Array.isArray(body.hcf)) {
      const nums = body.hcf.map(Number).filter(Number.isInteger);
      result = nums.reduce((acc, val) => gcd(acc, val), nums[0] || 0);
    } else if (key === "AI" && typeof body.AI === "string") {
      if (!GEMINI_KEY) {
        return res.status(500).json({
          is_success: false,
          official_email: EMAIL,
          message: "Gemini API key not configured",
        });
      }

      try {
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          {
            contents: [
              {
                parts: [{ text: body.AI }],
              },
            ],
          },
        );

        const aiText =
          geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        result = aiText.trim().split(/\s+/)[0] || "Unknown";
      } catch (err) {
        if (err.response?.status === 429) {
          return res.status(429).json({
            is_success: false,
            official_email: EMAIL,
            message: "AI quota exceeded",
          });
        }

        return res.status(500).json({
          is_success: false,
          official_email: EMAIL,
          message: "AI service error",
        });
      }
    } else {
      return res.status(400).json({
        is_success: false,
        official_email: EMAIL,
        message: "Invalid input format",
      });
    }

    return res.status(200).json({
      is_success: true,
      official_email: EMAIL,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      is_success: false,
      official_email: EMAIL,
      message: "Internal Server Error",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
