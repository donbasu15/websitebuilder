import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../config";

export function Home() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate("/builder", { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <span className="bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400 p-4 rounded-full shadow-lg">
              <Wand2 className="w-14 h-14 text-white drop-shadow-lg" />
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-3">
            Website Builder AI
          </h1>
          <p className="text-xl text-gray-200 font-light">
            Describe your dream website and let AI guide you step by step.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-950/80 rounded-2xl shadow-2xl p-8 border border-gray-800 backdrop-blur-md">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the website you want to build..."
              className="w-full h-36 p-4 bg-gray-900 text-gray-100 border border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none placeholder-gray-500 text-lg transition-all"
            />
            <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:scale-105 hover:shadow-pink-500/30 transition-all"
            >
              Generate Website Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
