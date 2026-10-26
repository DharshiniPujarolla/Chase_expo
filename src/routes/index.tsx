import WeakTopicAnalysis from "../components/weaktopicanalysis";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Bolt,
  BookOpen,
  CarFront,
  Check,
  ChevronRight,
  Coins,
  Factory,
  FlaskConical,
  GraduationCap,
  Hammer,
  Heart,
  Lightbulb,
  Loader2,
  Map,
  MessageCircle,
  Menu,
  Sparkles,
  Store,
  Trees,
  Trophy,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import townArtwork from "@/assets/chase-town.jpg";
import {
  answerQuestion,
  buildWorkshop,
  completeSubjectQuiz,
  getCompletedSubjectQuestionCount,
  getNextQuestion,
  getNextQuestionSelection,
  getQuestionForRetry,
  getSubjectQuizCompletionEvent,
  getTownBuildingState,
  getVisibleTownBuildings,
  INITIAL_PROGRESS,
  purchaseBuilding,
  recordQuestionHint,
  repairPowerStation,
  restoreGameProgress,
  type BuildingId,
  type GameProgress,
  type PhysicsQuestion,
  type Subject,
  WORKSHOP_COST,
} from "@/lib/chase-game";

const SAVE_KEY = "chase-town-progress-v1";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CHASE — Brightbridge Town" },
      {
        name: "description",
        content: "Restore the power station, solve Physics missions, and grow a bright little town in CHASE.",
      },
      { property: "og:title", content: "CHASE — Brightbridge Town" },
      {
        property: "og:description",
        content: "A cheerful town-building adventure powered by STEM challenges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameHome,
});

type Panel = "mission" | "building" | "town" | "buddy" | null;
type BuddyMessage = { role: "buddy" | "player"; topic?: string; text: string };

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function GameHome() {
  const [progress, setProgress] = useState<GameProgress>(INITIAL_PROGRESS);
  const [saveReady, setSaveReady] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [questionMode, setQuestionMode] = useState<"new" | "remedial" | "retry">("new");
  const [displayedQuestionIds, setDisplayedQuestionIds] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const [missionComplete, setMissionComplete] = useState(false);
  const [navigation, setNavigation] = useState("Town");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("physics");
  const [buildingNotice, setBuildingNotice] = useState<BuildingId | null>(null);
  const [buddyPrompt, setBuddyPrompt] = useState("");
  const [buddyLoading, setBuddyLoading] = useState(false);
  const [buddyMessages, setBuddyMessages] = useState<BuddyMessage[]>([{
    role: "buddy",
    topic: "Your friendly STEM guide",
    text: "Hi! I can explain a concept, give you an example, or offer a hint. Try asking about Ohm's law, fractions, quadratics, chemical reactions, binary search trees, or C++ loops.",
  }]);
  const buddyEndRef = useRef<HTMLDivElement>(null);
  const buddyRequestInFlightRef = useRef(false);
  const [question, setQuestion] = useState<PhysicsQuestion | null>(() => getNextQuestion(INITIAL_PROGRESS, "physics"));
  const isPowered = progress.repair >= 100;
  const powerStationComplete = progress.rewardEvents.includes("mission-complete:power-station");
  const townBuildings = getVisibleTownBuildings(progress);
  const mathsQuizComplete = progress.rewardEvents.includes("quiz-complete:mathematics");
  const chemistryQuizComplete = progress.rewardEvents.includes("quiz-complete:chemistry");
  const codingQuizComplete = progress.rewardEvents.includes("quiz-complete:computer-science");
  const chemistryLabComplete = townBuildings.find((building) => building.id === "chemical-lab")?.status === "completed";
  const codingStudioComplete = townBuildings.find((building) => building.id === "coding-workshop")?.status === "completed";
  const researchLabComplete = townBuildings.find((building) => building.id === "research-lab")?.status === "completed";
  const mathsQuestionsCompleted = Math.min(3, getCompletedSubjectQuestionCount(progress, "mathematics"));
  const chemistryQuestionsCompleted = Math.min(3, getCompletedSubjectQuestionCount(progress, "chemistry"));
  const codingQuestionsCompleted = Math.min(3, getCompletedSubjectQuestionCount(progress, "computer-science"));
  const completionBuildingId: BuildingId | null = selectedSubject === "mathematics"
    ? "research-lab"
    : selectedSubject === "chemistry"
      ? "chemical-lab"
      : selectedSubject === "computer-science"
        ? "coding-workshop"
        : null;
  const completionBuilding = completionBuildingId
    ? townBuildings.find((building) => building.id === completionBuildingId)
    : undefined;
  const completionBuildingStatus = completionBuildingId
    ? getTownBuildingState(progress, completionBuildingId)
    : null;
  const currentObjective = !powerStationComplete
    ? isPowered ? "Finish the Power Station repairs" : "Restore the Power Station"
    : !mathsQuizComplete
      ? "Complete the Mathematics Academy challenge"
      : !researchLabComplete
        ? "Construct the Research Lab"
        : !chemistryQuizComplete
          ? "Complete the Chemical Laboratory challenge"
          : !chemistryLabComplete
            ? "Construct the Chemical Laboratory"
            : !codingQuizComplete
              ? "Complete the Coding Studio challenge"
              : !codingStudioComplete
                ? "Construct the Coding Studio"
                : "Explore the Coding Studio";

  function startCurrentObjective() {
    if (!powerStationComplete) {
      openMission("physics");
    } else if (!mathsQuizComplete) {
      openMission("mathematics");
    } else if (!researchLabComplete) {
      setPanel("building");
    } else if (!chemistryQuizComplete) {
      openMission("chemistry");
    } else if (!chemistryLabComplete) {
      setPanel("building");
    } else if (!codingQuizComplete) {
      openMission("computer-science");
    } else {
      setPanel("building");
    }
  }

  function isQuizSubjectComplete(subject: Subject) {
    const completionEvent = getSubjectQuizCompletionEvent(subject);
    return completionEvent !== null && progress.rewardEvents.includes(completionEvent);
  }

  function selectMissionQuestion(
    subject: Subject,
    previousQuestionId?: string,
    excludedQuestionIds = displayedQuestionIds,
    targetConceptId?: string,
  ) {
    const selection = getNextQuestionSelection(
      progress,
      subject,
      previousQuestionId,
      excludedQuestionIds,
      targetConceptId,
    );
    setQuestion(selection?.question ?? null);
    setQuestionMode(selection?.mode ?? "new");
    if (selection) {
      setDisplayedQuestionIds((displayed) =>
        displayed.includes(selection.question.id)
          ? displayed
          : [...displayed, selection.question.id],
      );
    }
    return selection?.question ?? null;
  }

  function toggleQuestionHint() {
    if (!showHint && question) {
      setProgress((current) => recordQuestionHint(current, question));
    }
    setShowHint((shown) => !shown);
  }
  const missionLocked = selectedSubject === "chemistry"
    ? !researchLabComplete
    : selectedSubject === "computer-science"
      ? !chemistryLabComplete
      : false;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        const restored = restoreGameProgress(parsed);
        if (restored) {
          setProgress(restored);
          setQuestion(getNextQuestion(restored, "physics"));
        }
      }
    } catch {
      // The game remains playable if storage is unavailable or malformed.
    }
    setSaveReady(true);
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      // Keep the current session playable when storage is full or disabled.
    }
  }, [progress, saveReady]);

  useEffect(() => {
    buddyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [buddyMessages, buddyLoading]);

  function openMission(subject: Subject = "physics", targetConceptId?: string) {
    if (subject === "mathematics" && !powerStationComplete) {
      setSelectedSubject("physics");
      setSelectedAnswer(null);
      setQuestionMode("new");
      setDisplayedQuestionIds([]);
      setShowHint(false);
      setMessage("Repair the Power Station first to unlock the Mathematics Academy challenge.");
      setMissionComplete(false);
      setQuestion(getNextQuestion(progress, "physics"));
      setPanel("mission");
      return;
    }
    setSelectedSubject(subject);
    setSelectedAnswer(null);
    setQuestionMode("new");
    setDisplayedQuestionIds([]);
    setShowHint(false);
    setMessage("");
    const requiredBuilding = subject === "chemistry"
      ? "research-lab"
      : subject === "computer-science"
        ? "chemical-lab"
        : null;
    const requiredBuildingName = requiredBuilding
      ? townBuildings.find((building) => building.id === requiredBuilding)?.name
      : null;
    const locked = requiredBuilding !== null
      && townBuildings.find((building) => building.id === requiredBuilding)?.status !== "completed";
    if (locked) {
      setQuestion(null);
      setQuestionMode("new");
      setMissionComplete(false);
      setMessage(`${requiredBuildingName ?? "The previous building"} must be constructed before this mission unlocks.`);
      setPanel("mission");
      return;
    }
    const completed = subject === "physics"
      ? powerStationComplete
      : isQuizSubjectComplete(subject);
    setMissionComplete(completed);
    selectMissionQuestion(subject, undefined, [], targetConceptId);
    setPanel("mission");
  }

  function chooseAnswer(answer: string) {
    if (selectedAnswer || !question) return;
    setSelectedAnswer(answer);
    const result = answerQuestion(progress, question, answer, {
      retry: questionMode === "retry",
      remedial: questionMode === "remedial",
    });
    if (result.correct) {
      const nextProgress = selectedSubject === "physics"
        ? result.progress
        : completeSubjectQuiz(result.progress, selectedSubject);
      const completionEvent = getSubjectQuizCompletionEvent(selectedSubject);
      const completedNow = completionEvent !== null
        && !progress.rewardEvents.includes(completionEvent)
        && nextProgress.rewardEvents.includes(completionEvent);
      setProgress(nextProgress);
      if (completedNow) {
        setMessage(`${selectedSubject === "mathematics" ? "Maths" : selectedSubject === "chemistry" ? "Chemistry" : "Coding"} challenge complete! +35 coins · +40 XP · +2 building materials`);
        setMissionComplete(true);
      } else if (result.reward > 0) {
        setMessage(selectedSubject === "physics"
          ? "That's it! +25 coins · +20 XP · +1 copper wire"
          : "Correct! +25 coins · +20 XP · +1 building material");
      } else {
        setMessage("Correct! This question's reward was already collected.");
      }
    } else {
      setProgress(result.progress);
      setShowHint(true);
      setProgress((current) => recordQuestionHint(current, question));
      setMessage(`Not quite. ${question.explanation} A hint is shown below. Try this question again or choose another question.`);
    }
  }

  function continueMission() {
    if (selectedSubject !== "physics") {
      const nextQuestion = selectMissionQuestion(selectedSubject, question?.id);
      setSelectedAnswer(null);
      setShowHint(false);
      setMessage("");
      if (!nextQuestion) setMissionComplete(true);
      return;
    }

    if (isPowered) {
      finishPowerStationMission();
      return;
    }

    setSelectedAnswer(null);
    setShowHint(false);
    setMessage("");
    selectMissionQuestion(selectedSubject, question?.id);
  }

  function finishPowerStationMission() {
    const repaired = repairPowerStation(progress);
    if (repaired) setProgress(repaired);
    setMissionComplete(true);
  }

  async function sendBuddyMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await askBuddy(buddyPrompt);
  }

  async function askBuddy(prompt: string) {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt || buddyRequestInFlightRef.current) return;
    buddyRequestInFlightRef.current = true;
    setBuddyLoading(true);
    setBuddyMessages((messages) => [...messages, { role: "player", text: normalizedPrompt }]);

    const activeChallenge = question ? { concept: question.concept, hint: question.hint } : null;
    const previousMessages = buddyMessages.slice(-7).map((item) => ({
      role: item.role === "player" ? "user" : "assistant",
      content: item.text,
    }));
    const lowerPrompt = normalizedPrompt.toLowerCase();
    const intent = lowerPrompt.includes("practice") || lowerPrompt.includes("question")
      ? "practice"
      : lowerPrompt.includes("hint")
        ? "hint"
        : "explanation";

    let answer: string | null = null;
    let errorMessage = "The AI service did not return a usable answer. Please try again.";
    try {
      const response = await fetch("/api/stem-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...previousMessages, { role: "user", content: normalizedPrompt }],
          context: {
            subject: selectedSubject,
            concept: activeChallenge?.concept,
            intent,
            mastery: progress.subjectStats[selectedSubject].mastery,
            attempts: progress.subjectStats[selectedSubject].attempts,
            ...(intent === "hint" && panel === "mission" && activeChallenge
              ? { activeQuestionHint: activeChallenge.hint }
              : {}),
          },
        }),
      });
      const responseBody: unknown = await response.json().catch(() => null);
      if (
        response.ok &&
        isObjectRecord(responseBody) &&
        typeof responseBody.answer === "string" &&
        responseBody.answer.trim()
      ) {
        answer = responseBody.answer.trim();
      } else if (!response.ok && isObjectRecord(responseBody) && isObjectRecord(responseBody.error)) {
        const code = responseBody.error.code;
        const serverMessage = responseBody.error.message;
        errorMessage = code === "AI_PROVIDER_NOT_CONFIGURED"
          ? "Gemini is not configured on the server. Add GEMINI_API_KEY to the server environment and restart it."
          : typeof serverMessage === "string"
            ? serverMessage
            : "The AI service could not answer this request. Please try again.";
      } else if (response.ok) {
        errorMessage = "Gemini returned an empty or unreadable answer. Please try again.";
      } else {
        errorMessage = `Stem Buddy could not answer this request (HTTP ${response.status}). Please try again.`;
      }
    } catch {
      errorMessage = "Stem Buddy could not reach the AI endpoint. Check the development server connection.";
    }

    if (answer) {
      setBuddyPrompt("");
      setBuddyMessages((messages) => [...messages, { role: "buddy", topic: "Stem Buddy · AI response", text: answer }]);
    } else {
      setBuddyPrompt(normalizedPrompt);
      setBuddyMessages((messages) => [
        ...messages,
        {
          role: "buddy",
          topic: "AI response unavailable",
          text: errorMessage,
        },
      ]);
    }
    buddyRequestInFlightRef.current = false;
    setBuddyLoading(false);
  }

  function continueSubjectPractice() {
    const nextQuestion = selectMissionQuestion(selectedSubject, question?.id);
    setSelectedAnswer(null);
    setShowHint(false);
    setMessage("");
    setMissionComplete(!nextQuestion);
  }

  function reviewMissedQuestion() {
    const retryQuestion = getQuestionForRetry(progress, selectedSubject, question?.id);
    if (!retryQuestion) return;
    setQuestion(retryQuestion);
    setQuestionMode("retry");
    setSelectedAnswer(null);
    setShowHint(false);
    setMessage("Reviewing a previously missed question. A retry can earn its one-time question reward, but does not count as new mastery evidence.");
    setMissionComplete(false);
  }

  function buyWorkshop() {
    const next = buildWorkshop(progress);
    if (next) {
      setProgress(next);
      setPanel(null);
      return;
    }
    setMessage("Earn a few more coins by helping at the power station.");
  }

  function purchaseTownBuilding(buildingId: BuildingId) {
    const next = purchaseBuilding(progress, buildingId);
    if (!next) {
      setMessage("That building is still locked. Learn more, build mastery, and gather the needed resources.");
      return;
    }

    setProgress(next);
    setBuildingNotice(buildingId);
    setPanel(null);
    setMessage("");
  }

  function getBuildingUnlockText(buildingId: BuildingId) {
    switch (buildingId) {
      case "research-lab":
        return "Complete the Maths challenge with 60% mastery";
      case "math-centre":
        return "Complete the Maths challenge and restore the Power Station";
      case "chemical-lab":
        return "Build the Research Lab and complete Chemistry";
      case "coding-workshop":
        return "Build the Chemical Laboratory and complete Coding";
      case "workshop":
        return "Reach 20 XP and collect 50 coins";
      case "power-station":
        return "Complete the Physics repair mission";
    }
  }

  const percentToLevel = progress.xp % 100;
  const constructionBuilding = buildingNotice
    ? townBuildings.find((building) => building.id === buildingNotice)
    : null;
  const visibleBuildingCount = 5
    + Number(progress.builtWorkshop)
    + townBuildings.filter(
      (building) =>
        building.status === "completed" &&
        building.id !== "power-station" &&
        building.id !== "workshop",
    ).length;
  const currentSubjectQuestionCount = Math.min(3, getCompletedSubjectQuestionCount(progress, selectedSubject));
  const currentSubjectTitle = selectedSubject === "mathematics"
    ? "Maths"
    : selectedSubject === "chemistry"
      ? "Chemistry"
      : selectedSubject === "computer-science"
        ? "Coding"
        : "Physics";
  const selectedSubjectBuilding = selectedSubject === "chemistry"
    ? "Chemical Laboratory"
    : selectedSubject === "computer-science"
      ? "Coding Studio"
      : selectedSubject === "mathematics"
        ? "Mathematics Academy"
        : "Power Station";
  const objectiveAction = !powerStationComplete
    ? "LET'S GO"
    : !mathsQuizComplete
        ? "MATHS CHALLENGE"
        : !researchLabComplete
          ? "TOWN GOALS"
          : !chemistryQuizComplete
            ? "CHEMISTRY CHALLENGE"
            : !chemistryLabComplete
              ? "TOWN GOALS"
              : !codingQuizComplete
                ? "CODING CHALLENGE"
                : "TOWN GOALS";

  return (
    <main className="game-shell">
      <WeakTopicAnalysis
        progress={progress}
        onPractice={(subject, conceptId) => openMission(subject, conceptId)}
      />
      <header className="game-topbar">
        <a className="brand-lockup" href="/" aria-label="CHASE town home">
          <span className="brand-mark"><Zap size={18} fill="currentColor" /></span>
          <span className="brand-name">CHASE</span>
          <span className="brand-place">BRIGHTBRIDGE</span>
        </a>
        <div className="town-name"><span className="online-dot" /> YOUR TOWN <strong>Brightbridge</strong></div>
        <div className="topbar-actions">
          <Button variant="ghost" size="icon" aria-label="Open Stem Buddy" onClick={() => setPanel("buddy")}>
            <MessageCircle />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Town menu" onClick={() => setPanel("town")}>
            <Menu />
          </Button>
          <span className="avatar-mark" aria-label="Level 1 player"><GraduationCap size={18} /></span>
        </div>
      </header>

      <section className="status-strip" aria-label="Town resources">
        <div className="level-display">
          <span className="level-badge">{progress.level}</span>
          <div className="level-copy"><strong>APPRENTICE</strong><span>{progress.xp} / {progress.level * 100} XP</span></div>
          <div className="xp-track"><span style={{ width: `${percentToLevel}%` }} /></div>
        </div>
        <div className="resource-list">
          <div className="resource-pill"><span className="resource-icon coin"><Coins size={17} /></span><span><b>{progress.coins}</b><small>COINS</small></span><Button variant="ghost" size="icon" aria-label="Earn coins" onClick={() => openMission()}>+</Button></div>
          <div className="resource-pill"><span className="resource-icon wire"><Bolt size={17} /></span><span><b>{progress.wire}</b><small>WIRE</small></span></div>
          <div className="resource-pill"><span className="resource-icon heart"><Heart size={17} fill="currentColor" /></span><span><b>5</b><small>ENERGY</small></span><Button variant="ghost" size="icon" aria-label="Energy refill">+</Button></div>
        </div>
      </section>

      <section className="town-toolbar" aria-label="Current mission">
        <div className="mission-stamp"><span className="mission-icon"><Zap size={17} fill="currentColor" /></span><div><small>MAIN MISSION</small><strong>{currentObjective}</strong></div></div>
        <div className="mission-status"><span className={mathsQuizComplete ? "mission-check done" : "mission-check"}>{mathsQuizComplete ? <Check size={12} /> : "1"}</span><span>{powerStationComplete ? currentObjective : "Physics · Electricity"}</span></div>
        <Button className="mission-cta" size="sm" onClick={startCurrentObjective}>{objectiveAction}<ChevronRight size={15} /></Button>
      </section>

      <section className="world-frame" aria-label="Brightbridge town map">
        <div className="world-scene">
          <img className="town-artwork" src={townArtwork} alt="A leafy little town with cottages, a pond, gardens, and the broken power station" width={1536} height={1024} fetchPriority="high" />
          <div className="scene-vignette" aria-hidden="true" />
          {!isPowered && <div className="mission-pulse" aria-hidden="true"><span /></div>}
          {isPowered && <div className="station-glow" aria-hidden="true"><Lightbulb size={23} /></div>}

          <Button className="map-hotspot station-hotspot" variant="ghost" aria-label="Open the power station mission" onClick={() => openMission()}>
            {!isPowered && <span className="hotspot-marker">!</span>}
            <span className="hotspot-caption">{isPowered ? "POWER ON" : "POWER STATION"}</span>
          </Button>

          <Button className="map-hotspot house-hotspot" variant="ghost" aria-label="Visit a cottage" onClick={() => { setPanel("building"); setMessage("A cozy home, ready for a little spark."); }}>
            <span className="house-caption"><Heart size={12} fill="currentColor" /> {isPowered ? "HOME, SWEET HOME" : "WAITING FOR LIGHTS"}</span>
          </Button>

          {progress.builtWorkshop ? (
            <Button className="map-hotspot workshop-hotspot built" variant="ghost" aria-label="Visit your new workshop" onClick={() => { setPanel("building"); setMessage("Your workshop is ready for its first project!"); }}>
              <span className="hotspot-caption"><Factory size={13} /> MY WORKSHOP</span>
            </Button>
          ) : (
            <Button className="map-hotspot workshop-hotspot" variant="ghost" aria-label="Build a workshop" onClick={() => setPanel("building")}>
              <span className="build-site"><Hammer size={16} /><b>+</b></span><span className="hotspot-caption">BUILD WORKSHOP</span>
            </Button>
          )}

          {powerStationComplete && (
            <Button
              className={`map-hotspot academy-hotspot ${townBuildings.find((building) => building.id === "math-centre")?.status === "completed" ? "built" : "plot"} ${buildingNotice === "math-centre" ? "arriving" : ""}`}
              variant="ghost"
              aria-label={townBuildings.find((building) => building.id === "math-centre")?.status === "completed" ? "Visit the Mathematics Academy" : "Open the Mathematics Academy challenge"}
              onClick={() => townBuildings.find((building) => building.id === "math-centre")?.status === "completed"
                ? setPanel("building")
                : mathsQuizComplete ? setPanel("building") : openMission("mathematics")}
            >
              <span className="hotspot-caption"><GraduationCap size={13} /> {townBuildings.find((building) => building.id === "math-centre")?.status === "completed" ? "MATHS ACADEMY" : "MATHS ACADEMY · CHALLENGE"}</span>
            </Button>
          )}

          {townBuildings.find((building) => building.id === "research-lab")?.status === "completed" && (
            <Button className={`map-hotspot research-hotspot built ${buildingNotice === "research-lab" ? "arriving" : ""}`} variant="ghost" aria-label="Visit the Research Lab" onClick={() => setPanel("building")}>
              <span className="hotspot-caption"><FlaskConical size={13} /> RESEARCH LAB</span>
            </Button>
          )}

          {researchLabComplete && (
            <Button
              className={`map-hotspot chemical-hotspot ${chemistryLabComplete ? "built" : "plot"} ${buildingNotice === "chemical-lab" ? "arriving" : ""}`}
              variant="ghost"
              aria-label={chemistryLabComplete ? "Visit the Chemical Laboratory" : "Open the Chemistry challenge"}
              onClick={() => chemistryLabComplete
                ? setPanel("building")
                : chemistryQuizComplete ? setPanel("building") : openMission("chemistry")}
            >
              <span className="hotspot-caption"><FlaskConical size={13} /> {chemistryLabComplete ? "CHEMICAL LAB" : "CHEMISTRY · CHALLENGE"}</span>
            </Button>
          )}

          {chemistryLabComplete && (
            <Button
              className={`map-hotspot coding-hotspot ${codingStudioComplete ? "built" : "plot"} ${buildingNotice === "coding-workshop" ? "arriving" : ""}`}
              variant="ghost"
              aria-label={codingStudioComplete ? "Visit the Coding Studio" : "Open the Coding challenge"}
              onClick={() => codingStudioComplete
                ? setPanel("building")
                : codingQuizComplete ? setPanel("building") : openMission("computer-science")}
            >
              <span className="hotspot-caption"><BookOpen size={13} /> {codingStudioComplete ? "CODING STUDIO" : "CODING · C++"}</span>
            </Button>
          )}

          <div className="town-car" aria-hidden="true"><CarFront size={21} /></div>

          {!isPowered && <div className="speech-bubble"><span>Uh-oh! The town’s gone dark...</span><small>Tap the station to help!</small></div>}
          {isPowered && <div className="speech-bubble powered-bubble"><span>You did it, bright spark!</span><small>Brightbridge is shining again ✨</small></div>}

          <div className="scene-weather"><span>☀</span><span>Sunny day</span><i /></div>
          <div className="scene-compass"><Map size={14} /><span>BRIGHTBRIDGE</span></div>
          {progress.repair > 0 && !isPowered && <div className="repair-sign"><span>⚡</span><div><small>STATION REPAIRS</small><b>{progress.repair}%</b></div><div className="repair-meter"><span style={{ width: `${progress.repair}%` }} /></div></div>}
        </div>
      </section>

      <section className="town-footer">
        <div className="town-footer-left"><span className="town-heart"><Heart size={15} fill="currentColor" /></span><span><strong>Little town, big ideas.</strong><small>Every bright idea helps the whole town.</small></span></div>
        <div className="town-mini-stats"><span><Trees size={15} /> {visibleBuildingCount} buildings</span><span><Sparkles size={15} /> {progress.repair}% restored</span></div>
      </section>

      <nav className="bottom-nav" aria-label="Town navigation">
        {[
          { label: "Town", icon: Map, action: () => { setNavigation("Town"); setPanel(null); } },
          { label: "Missions", icon: Trophy, action: () => { setNavigation("Missions"); openMission(); } },
          { label: "Research", icon: FlaskConical, action: () => { setNavigation("Research"); setPanel("town"); } },
          { label: "Collection", icon: Store, action: () => { setNavigation("Collection"); setPanel("building"); } },
        ].map((item) => (
          <Button key={item.label} variant="ghost" className={`nav-item ${navigation === item.label ? "active" : ""}`} aria-label={item.label} onClick={item.action}>
            <item.icon size={19} /><span>{item.label}</span>{item.label === "Missions" && !isPowered && <i className="nav-alert" />}
          </Button>
        ))}
      </nav>

      <Dialog open={panel === "mission"} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent className="game-dialog mission-dialog">
          {missionLocked ? (
            <div className="completion-screen">
              <span className="completion-medallion"><FlaskConical size={34} /></span>
              <span className="eyebrow">{currentSubjectTitle.toUpperCase()} · LOCKED</span>
              <DialogHeader>
                <DialogTitle>{selectedSubjectBuilding} mission is locked</DialogTitle>
                <DialogDescription>{message}</DialogDescription>
              </DialogHeader>
              <p className="build-subtext">
                {selectedSubject === "chemistry"
                  ? "Complete the Maths challenge, then choose to construct the Research Lab."
                  : "Complete the Chemistry challenge, then choose to construct the Chemical Laboratory."}
              </p>
              <Button className="dialog-primary" onClick={() => setPanel("building")}>VIEW TOWN BUILDINGS <ChevronRight size={16} /></Button>
              <Button variant="ghost" onClick={() => setPanel(null)}>BACK TO TOWN</Button>
            </div>
          ) : missionComplete ? (
            <div className="completion-screen">
              {selectedSubject === "physics" ? (
                <>
                  <span className="completion-medallion"><Lightbulb size={34} /></span>
                  <span className="eyebrow">POWER STATION RESTORED · LEVEL 1 COMPLETE</span>
                  <DialogHeader>
                    <DialogTitle>Brightbridge is back!</DialogTitle>
                    <DialogDescription>The electricity challenge repaired the Power Station and opened a new plot for the Mathematics Academy.</DialogDescription>
                  </DialogHeader>
                  <div className="completion-rewards">
                    <span><Coins size={17} /> +60 coins</span>
                    <span><Trophy size={17} /> +40 XP · +3 building materials</span>
                  </div>
                  <Button className="dialog-primary" onClick={() => openMission("mathematics")}>START MATHS CHALLENGE <ChevronRight size={16} /></Button>
                  <Button variant="ghost" onClick={() => setPanel(null)}>BACK TO TOWN</Button>
                </>
              ) : (
                <>
                  <span className="completion-medallion">
                    {selectedSubject === "mathematics" ? <GraduationCap size={34} /> : selectedSubject === "chemistry" ? <FlaskConical size={34} /> : <BookOpen size={34} />}
                  </span>
                  <span className="eyebrow">{isQuizSubjectComplete(selectedSubject) ? `${currentSubjectTitle.toUpperCase()} CHALLENGE COMPLETE` : `${currentSubjectTitle.toUpperCase()} REVIEW`}</span>
                  <DialogHeader>
                    <DialogTitle>
                      {isQuizSubjectComplete(selectedSubject)
                        ? selectedSubject === "mathematics"
                          ? "A little maths goes a long way!"
                          : selectedSubject === "chemistry"
                            ? "Chemistry sparks a new build!"
                            : "Your code is ready to ship!"
                        : "You have reached the end of this set."}
                    </DialogTitle>
                    <DialogDescription>
                      {isQuizSubjectComplete(selectedSubject)
                        ? completionBuildingStatus === "available"
                          ? `Your correct answers earned learning rewards and qualified the ${completionBuilding?.name ?? "next building"} for construction.`
                          : completionBuildingStatus === "completed"
                            ? `Your challenge rewards are secured. The ${completionBuilding?.name ?? "next building"} is already built.`
                            : `Your correct answers earned learning rewards. Continue practicing to meet the ${completionBuilding?.name ?? "next building"} construction requirements.`
                        : "You can review missed questions or return to town. Your attempts and progress are saved."}
                    </DialogDescription>
                  </DialogHeader>
                  {isQuizSubjectComplete(selectedSubject) && (
                    <div className="completion-rewards">
                      <span><Coins size={17} /> +35 coins challenge bonus</span>
                      <span><Trophy size={17} /> +40 XP · +2 building materials</span>
                    </div>
                  )}
                  {isQuizSubjectComplete(selectedSubject) ? (
                    <Button className="dialog-primary" onClick={() => setPanel("building")}>
                      {completionBuildingStatus === "available"
                        ? `CONSTRUCT ${completionBuilding?.name.toUpperCase() ?? "NEXT BUILDING"}`
                        : completionBuildingStatus === "completed"
                          ? "VIEW TOWN BUILDINGS"
                          : "VIEW BUILDING REQUIREMENTS"} <ChevronRight size={16} />
                    </Button>
                  ) : question ? (
                    <Button className="dialog-primary" onClick={continueSubjectPractice}>
                      CONTINUE PRACTICE <ChevronRight size={16} />
                    </Button>
                  ) : (
                    getQuestionForRetry(progress, selectedSubject) && (
                      <Button className="dialog-primary" onClick={reviewMissedQuestion}>
                        REVIEW A MISSED QUESTION <ChevronRight size={16} />
                      </Button>
                    )
                  )}
                  {question && isQuizSubjectComplete(selectedSubject) && (
                    <Button variant="outline" onClick={continueSubjectPractice}>CONTINUE PRACTICE</Button>
                  )}
                  <Button variant="ghost" onClick={() => setPanel(null)}>BACK TO TOWN</Button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="dialog-kicker">
                <span>
                  {selectedSubject === "mathematics"
                    ? <GraduationCap size={14} />
                    : selectedSubject === "chemistry"
                      ? <FlaskConical size={14} />
                      : selectedSubject === "computer-science"
                        ? <BookOpen size={14} />
                        : <Zap size={14} fill="currentColor" />}
                </span>
                {selectedSubject === "physics"
                  ? "PHYSICS · POWER STATION"
                  : `${currentSubjectTitle.toUpperCase()} · ${selectedSubjectBuilding.toUpperCase()}`}
              </div>
              <DialogHeader className="question-heading">
                {selectedSubject !== "physics" ? (
                  <>
                    <div className="question-progress"><span>{currentSubjectTitle.toUpperCase()} REWARDS EARNED</span><b>{currentSubjectQuestionCount}/3</b></div>
                    <div className="question-track"><span style={{ width: `${Math.min(100, currentSubjectQuestionCount / 3 * 100)}%` }} /></div>
                    <DialogTitle>{selectedSubject === "mathematics" ? "Build Brightbridge with maths" : selectedSubject === "chemistry" ? "Explore the elements and reactions" : "Learn C++ by tracing code"}</DialogTitle>
                    <DialogDescription>
                      {selectedSubject === "mathematics"
                        ? "Answer three different questions correctly to earn a challenge bonus and qualify the Research Lab."
                        : selectedSubject === "chemistry"
                          ? "Answer three different Chemistry questions to earn a challenge bonus and qualify the Chemical Laboratory."
                          : "Answer three different C++ questions to earn a challenge bonus and qualify the Coding Studio."}
                    </DialogDescription>
                  </>
                ) : (
                  <>
                    <div className="question-progress"><span>REPAIR PROGRESS</span><b>{progress.repair}%</b></div>
                    <div className="question-track"><span style={{ width: `${progress.repair}%` }} /></div>
                    <DialogTitle>{isPowered ? "A quick victory lap!" : "Get the current flowing"}</DialogTitle>
                    <DialogDescription>{isPowered ? "Your power station is back online." : "Solve a little circuit puzzle to repair the station."}</DialogDescription>
                  </>
                )}
              </DialogHeader>
              {selectedSubject !== "physics" || !isPowered ? (
                <>
                  {question ? (
                    <div className="question-card">
                      <div className="question-label">
                        {selectedSubject === "mathematics"
                          ? <GraduationCap size={13} />
                          : selectedSubject === "chemistry"
                            ? <FlaskConical size={13} />
                            : selectedSubject === "computer-science"
                              ? <BookOpen size={13} />
                              : <Zap size={13} />}
                        {question.concept.toUpperCase()}
                        <span>
                          {selectedSubject !== "physics" ? ["EASY", "MEDIUM", "HARD"][question.level - 1] : `LEVEL ${question.level}`}
                          {` · YOUR LEVEL ${progress.subjectStats[selectedSubject].concepts[question.conceptId]?.difficulty ?? 1}`}
                          {questionMode === "remedial" ? " · REMEDIAL" : questionMode === "retry" ? " · RETRY" : ""}
                        </span>
                      </div>
                      <p className={selectedSubject === "computer-science" ? "code-prompt" : undefined}>{question.prompt}</p>
                      <div className="answer-list">
                        {question.options.map((option, index) => {
                          const isCorrectChoice = selectedAnswer && option === question.answer;
                          const isWrongChoice = selectedAnswer === option && option !== question.answer;
                          return (
                            <Button
                              key={option}
                              variant="ghost"
                              className={`answer-option ${isCorrectChoice ? "correct" : ""} ${isWrongChoice ? "incorrect" : ""}`}
                              disabled={Boolean(selectedAnswer)}
                              onClick={() => chooseAnswer(option)}
                            >
                              <span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{isCorrectChoice && <Check size={16} />}{isWrongChoice && <X size={16} />}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="answer-feedback" role="status">This subject's unseen question set is exhausted. Your progress is saved. Review a missed question or return to town.</p>
                  )}
                  {showHint && question && <div className="hint-box"><Lightbulb size={16} /><span>{question.hint}</span></div>}
                  {message && <p className={`answer-feedback ${selectedAnswer === question?.answer ? "positive" : ""}`} role="status">{message}</p>}
                  <div className="mission-dialog-actions">
                    <Button variant="ghost" className="hint-button" onClick={toggleQuestionHint}><Lightbulb size={16} /> {showHint ? "Hide hint" : "Need a hint?"}</Button>
                    {selectedAnswer && selectedAnswer !== question?.answer && (
                      <>
                        <Button variant="ghost" onClick={() => { setSelectedAnswer(null); setQuestionMode("retry"); setMessage("Retrying this question will not add new mastery evidence."); }}>TRY AGAIN</Button>
                        <Button className="dialog-primary" onClick={continueMission}>{selectedSubject === "physics" ? "SKIP CIRCUIT" : "NEXT QUESTION"} <ChevronRight size={16} /></Button>
                      </>
                    )}
                    {selectedAnswer && selectedAnswer === question?.answer && (
                      <Button className="dialog-primary" onClick={continueMission}>{selectedSubject !== "physics" ? "CONTINUE" : progress.repair >= 100 ? "FINISH REPAIR" : "NEXT CIRCUIT"} <ChevronRight size={16} /></Button>
                    )}
                  </div>
                  {!question && selectedSubject === "physics" && (
                    <div className="mission-dialog-actions">
                      {getQuestionForRetry(progress, selectedSubject) && (
                        <Button className="dialog-primary" onClick={reviewMissedQuestion}>REVIEW A MISSED QUESTION <ChevronRight size={16} /></Button>
                      )}
                    </div>
                  )}
                  <div className="reward-note"><Sparkles size={14} /> Correct answer: <b>25 coins + 20 XP + {selectedSubject === "physics" ? "a wire" : "1 building material"}</b></div>
                </>
              ) : (
                <Button className="dialog-primary victory-button" onClick={finishPowerStationMission}>REPAIR STATION & CLAIM REWARDS <Sparkles size={16} /></Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "building"} onOpenChange={(open) => { if (!open) { setPanel(null); setMessage(""); } }}>
        <DialogContent className="game-dialog building-dialog">
          <div className="building-art"><span>{progress.builtWorkshop ? <Factory size={32} /> : <Hammer size={32} />}</span><i><Trees size={16} /></i></div>
          <DialogHeader>
            <span className="eyebrow">{progress.builtWorkshop ? "YOUR TOWN · BUILDINGS" : "TOWN EXPANSION"}</span>
            <DialogTitle>{progress.builtWorkshop ? "Brightbridge grows" : "Choose a new build"}</DialogTitle>
            <DialogDescription>Every building has a cost, a purpose, and a learning path. Choose carefully as the town expands.</DialogDescription>
          </DialogHeader>

          <div className="field-guide-list">
            {townBuildings.map((building) => {
              const canAfford = progress.coins >= building.cost && progress.materials >= building.materials;
              const buttonLabel = building.status === "completed"
                ? "READY"
                : building.status === "locked"
                  ? "LOCKED"
                  : building.id === "power-station"
                    ? "REPAIR"
                  : canAfford
                    ? "CONSTRUCT"
                    : "NEED RESOURCES";

              return (
                <div key={building.id} className={`guide-item building-item ${building.status}`}>
                  <span className="guide-icon" aria-hidden="true">
                    {building.id === "power-station" ? <Zap size={17} /> : building.id === "research-lab" ? <FlaskConical size={17} /> : building.id === "math-centre" ? <GraduationCap size={17} /> : building.id === "coding-workshop" ? <BookOpen size={17} /> : <Factory size={17} />}
                  </span>
                  <span>
                    <b>{building.name}</b>
                    <small>
                      {building.subject} · {building.cost} coins · {building.materials} materials
                      {building.status === "locked" && ` · Unlock: ${getBuildingUnlockText(building.id)}`}
                    </small>
                  </span>
                  <Button
                    size="sm"
                    variant={building.status === "completed" ? "secondary" : "default"}
                    disabled={building.status === "completed" || building.status === "locked"}
                    onClick={() => building.id === "power-station" ? openMission("physics") : purchaseTownBuilding(building.id)}
                  >
                    {buttonLabel}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="cost-row"><span><Hammer size={17} /> Workshop</span><b><Coins size={16} /> {progress.builtWorkshop ? "BUILT" : `${WORKSHOP_COST} coins`}</b></div>
          {!progress.builtWorkshop && <p className={`building-note ${message ? "show" : ""}`} role="status">{message || `Your wallet: ${progress.coins} coins`}</p>}
          <Button className="dialog-primary" disabled={progress.builtWorkshop} onClick={progress.builtWorkshop ? () => setPanel(null) : buyWorkshop}>
            {progress.builtWorkshop ? "BACK TO TOWN" : progress.coins >= WORKSHOP_COST ? "BUILD WORKSHOP" : "NEED MORE COINS"} <ChevronRight size={16} />
          </Button>
          {!progress.builtWorkshop && !message && <p className="build-subtext">Help at the power station to earn coins, then choose the next town upgrade.</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={buildingNotice !== null} onOpenChange={(open) => { if (!open) setBuildingNotice(null); }}>
        <DialogContent className="game-dialog completion-dialog">
          <span className="completion-medallion"><Hammer size={32} /></span>
          <span className="eyebrow">CONSTRUCTION COMPLETE</span>
          <DialogHeader>
            <DialogTitle>{constructionBuilding?.name} is ready!</DialogTitle>
            <DialogDescription>
              {buildingNotice === "research-lab"
                ? "Your Research Lab is now part of Brightbridge. The Chemistry challenge is unlocked."
                : buildingNotice === "chemical-lab"
                  ? "Your Chemical Laboratory is built. The C++ Coding challenge is unlocked."
                  : buildingNotice === "coding-workshop"
                    ? "Your Coding Studio is built. Keep practising and explore the new town plot."
                    : "Your town has expanded. The new building and plot are saved to your progress."}
            </DialogDescription>
          </DialogHeader>
          {buildingNotice === "research-lab" || buildingNotice === "chemical-lab" ? (
            <Button
              className="dialog-primary"
              onClick={() => {
                const nextSubject = buildingNotice === "research-lab" ? "chemistry" : "computer-science";
                setBuildingNotice(null);
                openMission(nextSubject);
              }}
            >
              {buildingNotice === "research-lab" ? "START CHEMISTRY CHALLENGE" : "START CODING CHALLENGE"} <ChevronRight size={16} />
            </Button>
          ) : (
            <Button className="dialog-primary" onClick={() => setBuildingNotice(null)}>BACK TO TOWN <ChevronRight size={16} /></Button>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "town"} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent className="game-dialog town-dialog">
          <div className="dialog-kicker"><span><BookOpen size={14} /></span> YOUR FIELD GUIDE</div>
          <DialogHeader><DialogTitle>{navigation === "Research" ? "Curiosity corner" : "Welcome to Brightbridge"}</DialogTitle><DialogDescription>Good thinking makes great towns. Keep exploring, one bright idea at a time.</DialogDescription></DialogHeader>
          <div className="field-guide-list">
            <div><span className="guide-icon physics"><Zap size={17} /></span><span><b>Physics</b><small>Powering the town</small></span><span className="guide-state">IN PROGRESS</span></div>
            <div className="guide-item">
              <span className="guide-icon maths"><GraduationCap size={17} /></span>
              <span><b>Mathematics Academy</b><small>{powerStationComplete ? `${progress.subjectStats.mathematics.mastery}% mastery · ${mathsQuestionsCompleted}/3 challenge answers` : "Unlock by restoring the Power Station"}</small></span>
              <Button size="sm" disabled={!powerStationComplete} onClick={() => openMission("mathematics")}>{powerStationComplete ? "PLAY" : "LOCKED"}</Button>
            </div>
            <div className="guide-item">
              <span className="guide-icon chemistry"><FlaskConical size={17} /></span>
              <span><b>Chemical Laboratory · Chemistry</b><small>{researchLabComplete ? `${progress.subjectStats.chemistry.mastery}% mastery · ${chemistryQuestionsCompleted}/3 challenge answers` : "Unlock: construct the Research Lab"}</small></span>
              <Button size="sm" disabled={!researchLabComplete} onClick={() => chemistryQuizComplete ? setPanel("building") : openMission("chemistry")}>{researchLabComplete ? chemistryQuizComplete ? "BUILD" : "PLAY" : "LOCKED"}</Button>
            </div>
            <div className="guide-item">
              <span className="guide-icon coding"><BookOpen size={17} /></span>
              <span><b>Coding Studio · C++</b><small>{chemistryLabComplete ? `${progress.subjectStats["computer-science"].mastery}% mastery · ${codingQuestionsCompleted}/3 challenge answers` : "Unlock: construct the Chemical Laboratory"}</small></span>
              <Button size="sm" disabled={!chemistryLabComplete} onClick={() => codingQuizComplete ? setPanel("building") : openMission("computer-science")}>{chemistryLabComplete ? codingQuizComplete ? "BUILD" : "PLAY" : "LOCKED"}</Button>
            </div>
          </div>
          <p className="build-subtext">
            {townBuildings.find((building) => building.id === "research-lab")?.status === "available"
              ? "Research Lab unlocked! Choose Collection to construct it using coins and materials."
              : `Research Lab: complete the Maths challenge, reach 60% mastery and 80 XP, then gather 80 coins and 3 materials. Current materials: ${progress.materials}.`}
          </p>
          <Button className="dialog-primary" onClick={() => setPanel(null)}>BACK TO TOWN <ChevronRight size={16} /></Button>
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "buddy"} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent className="game-dialog buddy-dialog">
          <div className="dialog-kicker"><span><Bot size={15} /></span> STEM BUDDY · GEMINI</div>
          <DialogHeader>
            <DialogTitle>Ask a curious question</DialogTitle>
            <DialogDescription>Get friendly explanations and worked examples for Physics, Maths, Chemistry, Computer Science, and C++.</DialogDescription>
          </DialogHeader>
          <div className="buddy-messages" aria-live="polite">
            {buddyMessages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`buddy-message ${item.role}`}>
                {item.role === "buddy" && <span className="buddy-avatar"><Bot size={15} /></span>}
                <div className="buddy-bubble">
                  {item.topic && <strong>{item.topic}</strong>}
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            {buddyLoading && (
              <div className="buddy-message buddy-loading" role="status">
                <span className="buddy-avatar"><Bot size={15} /></span>
                <div className="buddy-bubble"><Loader2 size={15} className="buddy-spinner" /> Connecting to Stem Buddy...</div>
              </div>
            )}
            <div ref={buddyEndRef} />
          </div>
          {buddyMessages.length === 1 && (
            <div className="buddy-prompts" aria-label="Suggested questions">
              {["Explain Ohm's law", "Teach me fractions", "Show a C++ for loop"].map((prompt) => (
                <Button key={prompt} size="sm" variant="outline" disabled={buddyLoading} onClick={() => { void askBuddy(prompt); }}>{prompt}</Button>
              ))}
            </div>
          )}
          <form className="buddy-form" onSubmit={sendBuddyMessage}>
            <input
              aria-label="Ask Stem Buddy a question"
              value={buddyPrompt}
              disabled={buddyLoading}
              onChange={(event) => setBuddyPrompt(event.target.value)}
              placeholder="Ask about a STEM concept..."
              maxLength={300}
            />
            <Button type="submit" disabled={buddyLoading || !buddyPrompt.trim()} aria-label="Send question">
              {buddyLoading ? <Loader2 size={17} className="buddy-spinner" /> : <ChevronRight size={17} />}
            </Button>
          </form>
          <p className="buddy-demo-note">Stem Buddy responses are generated by Gemini. If the AI service is unavailable, no demo answer is substituted.</p>
        </DialogContent>
      </Dialog>
    </main>
  );
}
