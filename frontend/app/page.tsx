"use client";

import Link from "next/link";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";
import styles from "./page.module.css";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.glowTopRight} />
          <div className={styles.glowBottomLeft} />

          <div className={`${styles.heroContent} animate-fade-in-up`}>
            <div className={styles.heroBadge}>
              ✨ Real-Time Mentorship Platform
            </div>

            <h1 className={styles.heroTitle}>
              Learn Code with
              <br />
              <span className="gradient-text">Expert Mentors</span>
            </h1>

            <p className={styles.heroDesc}>
              Connect with experienced developers through live video calls,
              collaborate on code in real-time, and accelerate your learning
              journey.
            </p>

            <div className={styles.heroCta}>
              {user ? (
                <Link href="/dashboard">
                  <button className={`btn-primary ${styles.heroBtn}`}>
                    Go to Dashboard
                  </button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <button className={`btn-primary ${styles.heroBtn}`}>
                      🚀 Start Learning
                    </button>
                  </Link>
                  <Link href="/login">
                    <button className={`btn-outline ${styles.heroBtn}`}>
                      Sign In →
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2 className={styles.featuresTitle}>
            Everything You Need to{" "}
            <span className="gradient-text">Grow</span>
          </h2>

          <div className={styles.featuresGrid}>
            {[
              {
                icon: "🎥",
                title: "Live Video Calls",
                desc: "Face-to-face mentoring sessions with crystal-clear video and audio powered by WebRTC.",
              },
              {
                icon: "💻",
                title: "Collaborative Code Editor",
                desc: "Write and review code together in real-time with a feature-rich Monaco editor.",
              },
              {
                icon: "💬",
                title: "Instant Messaging",
                desc: "Chat with your mentor during sessions. All messages are saved for future reference.",
              },
            ].map((feature, i) => (
              <div key={i} className={`glass-card ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
