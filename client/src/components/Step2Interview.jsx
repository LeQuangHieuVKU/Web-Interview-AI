import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "motion/react";
import axios from "axios";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { ServerURL } from "../App";
import { BsArrowRight } from "react-icons/bs";

function Step2Interview({ interviewData, onFinish }) {
  const { interviewId, questions = [], userName } = interviewData ?? {};
  const [isIntrophase, setIsIntrophase] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const regconitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");

  const videoRef = useRef(null);
  const isListeningRef = useRef(false);
  const currentQuestion = questions[currentIndex];
  const currentQuestionText = currentQuestion?.question || "";

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;

      const femaleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female"),
      );

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      // try known male voice
      const maleVoice = voices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male"),
      );

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      //fallback first voice
      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;

  const startMic = () => {
    if (regconitionRef.current && !isAIPlaying && !isListeningRef.current) {
      try {
        regconitionRef.current.start();
        isListeningRef.current = true;
      } catch (error) {
        console.log("Speech recognition error:", error);
      }
    }
  };

  const stopMic = () => {
    if (regconitionRef.current && isListeningRef.current) {
      regconitionRef.current.stop();
      isListeningRef.current = false;
    }
  };

  //Speak Function
  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();

      //Add natural paused after commas and preiods

      const humanText = text.replace(/,/g, ",...").replace(/\./g, "...");

      const utterance = new SpeechSynthesisUtterance(humanText);
      utterance.voice = selectedVoice;

      //human-likes pacing
      utterance.rate = 0.92; //slightly slower than normal
      utterance.pitch = 1.05; //small warmth
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic();
        videoRef.current?.play();
      };

      utterance.onend = () => {
        videoRef.current?.pause();
        videoRef.current.currentTime = 0;
        setIsAIPlaying(false);

        if (isMicOn) {
          startMic();
        }

        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };

      setSubtitle(text);
      window.speechSynthesis.speak(utterance);
    });
  };

  useEffect(() => {
    if (!selectedVoice) {
      return;
    }

    const runIntro = async () => {
      if (isIntrophase) {
        await speakText(
          `Hello ${userName}, it's great to meet you today! I hope you're felling confident and ready`,
        );

        await speakText(
          `I'll ask you a few questions. Just answer naturally, and take your time. Let's be begin`,
        );

        setIsIntrophase(false);
      } else if (currentQuestion) {
        await new Promise((r) => setTimeout(r, 800));

        if (currentIndex === questions.length - 1) {
          await speakText(`Alright, this one might be a bit more challenging.`);
        }
        await speakText(currentQuestionText);
      }
    };
    runIntro();
  }, [selectedVoice, isIntrophase, currentIndex]);

  useEffect(() => {
    if (isIntrophase) return;
    if (!currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isIntrophase, currentIndex]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListeningRef.current = true;
    };

    recognition.onend = () => {
      isListeningRef.current = false;
    };

    recognition.onerror = () => {
      isListeningRef.current = false;
    };

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;

      setAnswer((prev) => prev + " " + transcript);
    };
    regconitionRef.current = recognition;
  }, []);

  const toggleMic = () => {
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
    setIsMicOn(!isMicOn);
  };

  const submitAnswer = async (isTimeoutAutoSubmit = false) => {
    if (isSubmitting) return;
    stopMic();
    setIsSubmitting(true);

    try {
      const result = await axios.post(
        ServerURL + "/api/interview/submit-answer",
        {
          interviewId,
          questionIndex: currentIndex,
          answer,
          timeTaken: currentQuestion.timeLimit - timeLeft,
        },
        { withCredentials: true },
      );
      const responseFeedback =
        result.data?.feedback || "No feedback available.";
      setFeedback(responseFeedback);
      await speakText(responseFeedback);
      setIsSubmitting(false);

      if (isTimeoutAutoSubmit) {
        setTimeout(() => {
          handleNext();
        }, 300);
      }
    } catch (error) {
      console.log(error);
      setIsSubmitting(false);
    }
  };
  async function handleNext() {
    setAnswer("");
    setFeedback("");

    if (currentIndex + 1 >= questions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let's move on to the next question.");

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setTimeLeft(questions[nextIndex]?.timeLimit || 60);
    setTimeout(() => {
      if (isMicOn) startMic();
    }, 500);
  }

  async function finishInterview() {
    stopMic();
    setIsMicOn(false);
    try {
      const result = await axios.post(
        ServerURL + "/api/interview/finish",
        { interviewId },
        { withCredentials: true },
      );

      console.log(result.data);
      onFinish(result.data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (isIntrophase) return;
    if (!currentQuestion) return;

    if (timeLeft === 0 && !isSubmitting && !feedback) {
      const timeoutId = setTimeout(() => {
        submitAnswer(true);
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [timeLeft, isIntrophase, currentQuestion, isSubmitting, feedback]);

  useEffect(() => {
    return () => {
      if (regconitionRef.current) {
        isListeningRef.current = false;
        regconitionRef.current.stop();
        regconitionRef.current.abort();
      }

      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-100 
      flex-items-center justify-center p-4 sm:p-6"
    >
      <div
        className="w-full max-w-350 min-h-[80vh] bg-white rounded-3xl 
        shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflox-hidden"
      >
        {/*Video Section*/}
        <div className="w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl">
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              className="w-full h-auto object-cover"
            />
          </div>
          {/*Subtitle Pending*/}
          {subtitle && (
            <div className="w-full max-w-md bg-gray-50 border border-gray-20 rounded-xl p-4 shadow-sm">
              <p className="text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed">
                {subtitle}
              </p>
            </div>
          )}

          {/*Time Area*/}
          <div className="w-full max-w-md bg-white-border border-gray-200 rounded-2xl shadow-md p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Interview Status</span>
              {isAIPlaying && (
                <span className="text-sm font-semibold text-emerald-600">
                  {isAIPlaying ? "AI Speaking" : ""}
                </span>
              )}
            </div>
            <div className="h-px bg-gray-200"></div>
            <div className="flex justify-center">
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timeLimit}
              />
            </div>

            <div className="h-px bg-gray-200"></div>
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {currentIndex + 1}
                </span>
                <span className="text-xs text-gray-400">Current Question</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-emerald-600">
                  {questions.length}
                </span>
                <span className="text-xs text-gray-400">Total Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/*Text Section*/}
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-6">
            AI Smart Interview
          </h2>

          {!isIntrophase && (
            <div className="relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs sm:text-sm text-gray-400 mb-2">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <div className="text-base sm:text-lg font-semibold text-gray-800 leading-relaxed">
                {currentQuestionText}
              </div>
            </div>
          )}
          <textarea
            placeholder="Type your answer here ..."
            onChange={(e) => setAnswer(e.target.value)}
            value={answer}
            className="flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 
              focus:ring-2 focus:ring-emerald-500 transition text-gray-800"
          />

          {!feedback ? (
            <div className="flex items-center gap-4 mt-6">
              <motion.button
                onClick={toggleMic}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 sm:w-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg"
              >
                {isMicOn ? (
                  <FaMicrophone size={20} />
                ) : (
                  <FaMicrophoneSlash size={20} />
                )}
              </motion.button>
              <motion.button
                onClick={submitAnswer}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm"
            >
              <p className="text-emerald-700 font-medium mb-4">{feedback}</p>
              <button
                onClick={handleNext}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 rounded-xl 
                shadow-md hover:opacity-90 transition flex items-center justify-center gap-1"
              >
                Next Question <BsArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Step2Interview;
