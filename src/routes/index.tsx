import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bolt,
  BookOpen,
  Check,
  ChevronRight,
  Coins,
  Factory,
  FlaskConical,
  GraduationCap,
  Hammer,
  Heart,
  Lightbulb,
  Map,
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
  getNextQuestion,
  INITIAL_PROGRESS,
  type GameProgress,
  type PhysicsQuestion,
  QUESTIONS,
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

type Panel = "mission" | "building" | "town" | null;

function GameHome() {
  const [progress, setProgress] = useState<GameProgress>(INITIAL_PROGRESS);
  const [saveReady, setSaveReady] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("");
  const [missionStep, setMissionStep] = useState(0);
  const [navigation, setNavigation] = useState("Town");
  const [question, setQuestion] = useState<PhysicsQuestion>(() => getNextQuestion(INITIAL_PROGRESS));
  const isPowered = progress.repair >= 100;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isValidProgress(parsed)) {
          setProgress(parsed);
          setQuestion(getNextQuestion(parsed));
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

  function openMission() {
    setSelectedAnswer(null);
    setShowHint(false);
    setMessage("");
    setMissionStep(0);
    setQuestion(getNextQuestion(progress));
    setPanel("mission");
  }

  function chooseAnswer(answer: string) {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    if (answer === question.answer) {
      const result = answerQuestion(progress, question, answer);
      setProgress(result.progress);
      setMessage("That's it! +25 coins · +20 XP · +1 copper wire");
    } else {
      const result = answerQuestion(progress, question, answer);
      setProgress(result.progress);
      setMessage("Not quite — take another look at the hint and try again.");
    }
  }

  function continueMission() {
    if (isPowered) {
      setMessage("The lights are on! Brightbridge is back in business.");
      setMissionStep(2);
      return;
    }
    setSelectedAnswer(null);
    setShowHint(false);
    setMessage("");
    setQuestion(getNextQuestion(progress));
    setMissionStep((step) => step + 1);
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

  const percentToLevel = progress.xp % 100;

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <a className="brand-lockup" href="/" aria-label="CHASE town home">
          <span className="brand-mark"><Zap size={18} fill="currentColor" /></span>
          <span className="brand-name">CHASE</span>
          <span className="brand-place">BRIGHTBRIDGE</span>
        </a>
        <div className="town-name"><span className="online-dot" /> YOUR TOWN <strong>Brightbridge</strong></div>
        <div className="topbar-actions">
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
          <div className="resource-pill"><span className="resource-icon coin"><Coins size={17} /></span><span><b>{progress.coins}</b><small>COINS</small></span><Button variant="ghost" size="icon" aria-label="Earn coins" onClick={openMission}>+</Button></div>
          <div className="resource-pill"><span className="resource-icon wire"><Bolt size={17} /></span><span><b>{progress.wire}</b><small>WIRE</small></span></div>
          <div className="resource-pill"><span className="resource-icon heart"><Heart size={17} fill="currentColor" /></span><span><b>5</b><small>ENERGY</small></span><Button variant="ghost" size="icon" aria-label="Energy refill">+</Button></div>
        </div>
      </section>

      <section className="town-toolbar" aria-label="Current mission">
        <div className="mission-stamp"><span className="mission-icon"><Zap size={17} fill="currentColor" /></span><div><small>MAIN MISSION</small><strong>{isPowered ? "A brighter Brightbridge" : "Lights out in Brightbridge"}</strong></div></div>
        <div className="mission-status"><span className={isPowered ? "mission-check done" : "mission-check"}>{isPowered ? <Check size={12} /> : "1"}</span><span>{isPowered ? "Power restored" : "Restore the power station"}</span></div>
        <Button className="mission-cta" size="sm" onClick={openMission}>{isPowered ? "REVISIT" : "LET'S GO"}<ChevronRight size={15} /></Button>
      </section>

      <section className="world-frame" aria-label="Brightbridge town map">
        <div className="world-scene">
          <img className="town-artwork" src={townArtwork} alt="A leafy little town with cottages, a pond, gardens, and the broken power station" width={1536} height={1024} fetchPriority="high" />
          <div className="scene-vignette" aria-hidden="true" />
          {!isPowered && <div className="mission-pulse" aria-hidden="true"><span /></div>}
          {isPowered && <div className="station-glow" aria-hidden="true"><Lightbulb size={23} /></div>}

          <Button className="map-hotspot station-hotspot" variant="ghost" aria-label="Open the power station mission" onClick={openMission}>
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

          {!isPowered && <div className="speech-bubble"><span>Uh-oh! The town’s gone dark...</span><small>Tap the station to help!</small></div>}
          {isPowered && <div className="speech-bubble powered-bubble"><span>You did it, bright spark!</span><small>Brightbridge is shining again ✨</small></div>}

          <div className="scene-weather"><span>☀</span><span>Sunny day</span><i /></div>
          <div className="scene-compass"><Map size={14} /><span>BRIGHTBRIDGE</span></div>
          {progress.repair > 0 && !isPowered && <div className="repair-sign"><span>⚡</span><div><small>STATION REPAIRS</small><b>{progress.repair}%</b></div><div className="repair-meter"><span style={{ width: `${progress.repair}%` }} /></div></div>}
        </div>
      </section>

      <section className="town-footer">
        <div className="town-footer-left"><span className="town-heart"><Heart size={15} fill="currentColor" /></span><span><strong>Little town, big ideas.</strong><small>Every bright idea helps the whole town.</small></span></div>
        <div className="town-mini-stats"><span><Trees size={15} /> {progress.builtWorkshop ? "6" : "5"} buildings</span><span><Sparkles size={15} /> {progress.repair}% restored</span></div>
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
          {missionStep === 2 ? (
            <div className="completion-screen">
              <span className="completion-medallion"><Lightbulb size={34} /></span>
              <span className="eyebrow">MISSION COMPLETE</span>
              <DialogHeader><DialogTitle>Brightbridge is back!</DialogTitle><DialogDescription>You brought the lights back on. The town is glowing thanks to you.</DialogDescription></DialogHeader>
              <div className="completion-rewards"><span><Coins size={17} /> +{progress.repair >= 100 ? "100" : "0"} coins earned</span><span><Trophy size={17} /> +80 XP toward your next level</span></div>
              <Button className="dialog-primary" onClick={() => setPanel(null)}>BACK TO TOWN <ChevronRight size={16} /></Button>
            </div>
          ) : (
            <>
              <div className="dialog-kicker"><span><Zap size={14} fill="currentColor" /></span> PHYSICS · POWER STATION</div>
              <DialogHeader className="question-heading">
                <div className="question-progress"><span>REPAIR PROGRESS</span><b>{progress.repair}%</b></div>
                <div className="question-track"><span style={{ width: `${progress.repair}%` }} /></div>
                <DialogTitle>{isPowered ? "A quick victory lap!" : "Get the current flowing"}</DialogTitle>
                <DialogDescription>{isPowered ? "Your power station is back online." : "Solve a little circuit puzzle to repair the station."}</DialogDescription>
              </DialogHeader>
              {!isPowered && (
                <>
                  <div className="question-card">
                    <div className="question-label"><Zap size={13} /> CIRCUIT CHALLENGE <span>LEVEL {Math.min(3, progress.level)}</span></div>
                    <p>{question.prompt}</p>
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
                  {showHint && <div className="hint-box"><Lightbulb size={16} /><span>{question.hint}</span></div>}
                  {message && <p className={`answer-feedback ${selectedAnswer === question.answer ? "positive" : ""}`} role="status">{message}</p>}
                  <div className="mission-dialog-actions">
                    <Button variant="ghost" className="hint-button" onClick={() => setShowHint((shown) => !shown)}><Lightbulb size={16} /> {showHint ? "Hide hint" : "Need a hint?"}</Button>
                    {selectedAnswer && <Button className="dialog-primary" onClick={continueMission}>{progress.repair >= 100 ? "FINISH REPAIR" : "NEXT CIRCUIT"} <ChevronRight size={16} /></Button>}
                  </div>
                  <div className="reward-note"><Sparkles size={14} /> Correct answer: <b>25 coins + 20 XP + a wire</b></div>
                </>
              )}
              {isPowered && <Button className="dialog-primary victory-button" onClick={() => { setMissionStep(2); setMessage(""); }}>CELEBRATE <Sparkles size={16} /></Button>}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "building"} onOpenChange={(open) => { if (!open) { setPanel(null); setMessage(""); } }}>
        <DialogContent className="game-dialog building-dialog">
          <div className="building-art"><span>{progress.builtWorkshop ? <Factory size={32} /> : <Hammer size={32} />}</span><i><Trees size={16} /></i></div>
          <DialogHeader>
            <span className="eyebrow">{progress.builtWorkshop ? "YOUR TOWN · BUILDING" : "TOWN EXPANSION"}</span>
            <DialogTitle>{progress.builtWorkshop ? "Brightbridge Workshop" : "Build a little workshop"}</DialogTitle>
            <DialogDescription>{progress.builtWorkshop ? "The workshop is open! Your next big idea starts here." : "Give curious minds a place to make, fix, and invent together."}</DialogDescription>
          </DialogHeader>
          <div className="cost-row"><span><Hammer size={17} /> Construction cost</span><b><Coins size={16} /> {progress.builtWorkshop ? "BUILT" : `${WORKSHOP_COST} coins`}</b></div>
          {!progress.builtWorkshop && <p className={`building-note ${message ? "show" : ""}`} role="status">{message || `Your wallet: ${progress.coins} coins`}</p>}
          <Button className="dialog-primary" disabled={progress.builtWorkshop} onClick={progress.builtWorkshop ? () => setPanel(null) : buyWorkshop}>
            {progress.builtWorkshop ? "BACK TO TOWN" : progress.coins >= WORKSHOP_COST ? "BUILD WORKSHOP" : "NEED MORE COINS"} <ChevronRight size={16} />
          </Button>
          {!progress.builtWorkshop && !message && <p className="build-subtext">Help at the power station to earn coins.</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "town"} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <DialogContent className="game-dialog town-dialog">
          <div className="dialog-kicker"><span><BookOpen size={14} /></span> YOUR FIELD GUIDE</div>
          <DialogHeader><DialogTitle>{navigation === "Research" ? "Curiosity corner" : "Welcome to Brightbridge"}</DialogTitle><DialogDescription>Good thinking makes great towns. Keep exploring, one bright idea at a time.</DialogDescription></DialogHeader>
          <div className="field-guide-list">
            <div><span className="guide-icon physics"><Zap size={17} /></span><span><b>Physics</b><small>Powering the town</small></span><span className="guide-state">IN PROGRESS</span></div>
            <div><span className="guide-icon maths"><GraduationCap size={17} /></span><span><b>Maths</b><small>Coming up next</small></span><span className="guide-lock">SOON</span></div>
            <div><span className="guide-icon chemistry"><FlaskConical size={17} /></span><span><b>Chemistry</b><small>Coming up next</small></span><span className="guide-lock">SOON</span></div>
          </div>
          <Button className="dialog-primary" onClick={() => setPanel(null)}>BACK TO TOWN <ChevronRight size={16} /></Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function isValidProgress(value: unknown): value is GameProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<GameProgress>;
  return typeof progress.coins === "number"
    && typeof progress.xp === "number"
    && typeof progress.wire === "number"
    && typeof progress.repair === "number"
    && typeof progress.level === "number"
    && typeof progress.streak === "number"
    && typeof progress.misses === "number"
    && Array.isArray(progress.answered)
    && typeof progress.builtWorkshop === "boolean";
}
