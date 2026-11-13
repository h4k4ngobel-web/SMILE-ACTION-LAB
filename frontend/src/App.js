import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignIn, SignUp } from "@clerk/react";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import AuthSetupNotice from "@/components/auth/AuthSetupNotice";
import { useAuthMode, useSafeAuth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { MeProvider } from "@/lib/api";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";
import Talk from "@/pages/Talk";
import Learn from "@/pages/Learn";
import Article from "@/pages/Article";
import Play from "@/pages/Play";
import QuizRun from "@/pages/QuizRun";
import LifePlanner from "@/pages/LifePlanner";
import { MemoryMatch, StoryQuest, WordSearch } from "@/pages/GameModes";
import Update from "@/pages/Update";
import EventDetail from "@/pages/EventDetail";
import Community from "@/pages/Community";
import PikrHub from "@/pages/PikrHub";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Brand from "@/pages/Brand";
import { Smilo } from "@/components/brand/Smilo";

const Protected = ({ children }) => {
  const { isSignedIn, isLoaded } = useSafeAuth();
  const { enabled } = useAuthMode();

  if (!isLoaded) return null;
  if (!enabled) return <Navigate to="/sign-in" replace />;
  return isSignedIn ? children : <Navigate to="/sign-in" replace />;
};

const AuthShell = ({ children }) => (
  <div className="sal-sky grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
    <div className="hidden flex-col items-center justify-center p-10 lg:flex">
      <Smilo pose="hero" float className="h-80" />
      <h2 className="mt-6 text-3xl font-bold">Halo, aku SMILO!</h2>
      <p className="mt-2 max-w-sm text-center text-[#68748C]">Masuk untuk menyimpan progres belajar, XP, dan riwayat ceritamu.</p>
    </div>
    <div className="flex items-center justify-center px-4 py-10">{children}</div>
  </div>
);

function AppRoutes() {
  const { enabled } = useAuthMode();

  return (
    <MeProvider>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/sign-in/*" element={enabled ? <AuthShell><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></AuthShell> : <AuthSetupNotice mode="sign-in" />} />
          <Route path="/sign-up/*" element={enabled ? <AuthShell><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></AuthShell> : <AuthSetupNotice mode="sign-up" />} />
          <Route path="/talk" element={<Talk />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:id" element={<Article />} />
          <Route path="/update/:id" element={<Article />} />
          <Route path="/play" element={<Play />} />
          <Route path="/play/quiz/:id" element={<QuizRun />} />
          <Route path="/play/life-planner" element={<LifePlanner />} />
          <Route path="/play/word-search" element={<WordSearch />} />
          <Route path="/play/memory-match" element={<MemoryMatch />} />
          <Route path="/play/story-quest" element={<StoryQuest />} />
          <Route path="/update" element={<Update />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/komunitas" element={<Community />} />
          <Route path="/pikr" element={<PikrHub />} />
          <Route path="/brand" element={<Brand />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin" element={<Protected><Admin /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkAuthProvider>
        <AppRoutes />
      </ClerkAuthProvider>
    </BrowserRouter>
  );
}

export default App;
