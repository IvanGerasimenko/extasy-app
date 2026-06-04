import cors from "cors";
import "dotenv/config";
import express from "express";
const app = express();
app.use(cors());
app.use(express.json());
type User = {
  id: number;
  googleId?: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  picture?: string;
  photos?: string[];
  about?: string;
  age?: string;
  city?: string;
  country?: string;
  gender?: string;
  lookingFor?: string;
  interests?: string[];
  onboardingCompleted: boolean;
  createdAt: string;
};

const users: User[] = [];
const phoneCodes = new Map<
  string,
  {
    code: string;
    expiresAt: number;
  }
>();

function normalizePhoneNumber(countryCode: string, phoneNumber: string) {
  const cleanedCode = String(countryCode).replace(/[^\d+]/g, "");
  const cleanedPhone = String(phoneNumber).replace(/\D/g, "");
  return `${cleanedCode}${cleanedPhone}`;
}

function createSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// this is serverStartTime a backend
const serverStartTime = Date.now();

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m  ${seconds}s `;
}

app.get("/uptime", (req, res) => {
  const uptimeMS = Date.now() - serverStartTime;

  res.json({
    uptime: formatUptime(uptimeMS),
  });
});

setInterval(() => {
  console.log("Time is starting:", formatUptime(Date.now() - serverStartTime));
}, 1000);

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.post("/auth/google", (req, res) => {
  console.log("Google auth body:", req.body);

  const { googleId, email, name, picture } = req.body;

  if (!googleId || !email) {
    return res.status(400).json({
      message: "googleId and email are required",
    });
  }

  let user = users.find((item) => item.googleId === googleId);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;

    user = {
      id: users.length + 1,
      googleId,
      email,
      name,
      picture,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
  }
  return res.json({
    user,
    isNewUser,
  });
});

app.post("/auth/phone/start", (req, res) => {
  const { countryCode, phoneNumber } = req.body;

  if (!countryCode || !phoneNumber) {
    return res.status(400).json({
      message: "countryCode and phoneNumber are required",
    });
  }

  const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
  const code = createSmsCode();

  phoneCodes.set(normalizedPhoneNumber, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  console.log(`[Phone Auth] Code for ${normalizedPhoneNumber}: ${code}`);

  return res.json({
    message: "Verification code sent",
    devCode: code,
  });
});

app.post("/auth/phone/verify", (req, res) => {
  const { countryCode, phoneNumber, code } = req.body;

  if (!countryCode || !phoneNumber || !code) {
    return res.status(400).json({
      message: "countryCode, phoneNumber and code are required",
    });
  }

  const normalizedPhoneNumber = normalizePhoneNumber(countryCode, phoneNumber);
  const savedCode = phoneCodes.get(normalizedPhoneNumber);

  if (!savedCode || savedCode.expiresAt < Date.now()) {
    phoneCodes.delete(normalizedPhoneNumber);

    return res.status(400).json({
      message: "Verification code expired",
    });
  }

  if (savedCode.code !== String(code).trim()) {
    return res.status(400).json({
      message: "Verification code is incorrect",
    });
  }

  phoneCodes.delete(normalizedPhoneNumber);

  let user = users.find((item) => item.phoneNumber === normalizedPhoneNumber);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;

    user = {
      id: users.length + 1,
      phoneNumber: normalizedPhoneNumber,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
  }

  return res.json({
    user,
    isNewUser,
  });
});

app.patch("/users/:id/onboarding", (req, res) => {
  const userId = Number(req.params.id);
  const user = users.find((item) => item.id === userId);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const {
    name,
    picture,
    photos,
    about,
    age,
    city,
    country,
    gender,
    lookingFor,
    interests,
  } = req.body;

  Object.assign(user, {
    name: name ?? user.name,
    picture: picture ?? user.picture,
    photos: Array.isArray(photos) ? photos : user.photos,
    about: about ?? user.about,
    age: age ?? user.age,
    city: city ?? user.city,
    country: country ?? user.country,
    gender: gender ?? user.gender,
    lookingFor: lookingFor ?? user.lookingFor,
    interests: Array.isArray(interests) ? interests : user.interests,
    onboardingCompleted: true,
  });

  return res.json({ user });
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
});
