// components/FloatingXanaButton.tsx
"use client";

import { generateToken } from "@/utility/auth";
import { getAccessGroup } from "@/utility/indexed-db";
import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useTranslation } from "next-i18next";

export default function FloatingXanaButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const boundsRef = useRef<HTMLDivElement | null>(null);

  const {t} = useTranslation('navigation');

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    (async () => {
      const token = await getAccessGroup();
      setIsLoggedIn(!!token?.ifricdi);
    })();

    const saved = localStorage.getItem("xanaFabXY");
    if (saved) {
      try {
        const { x: sx, y: sy } = JSON.parse(saved);
        x.set(sx || 0);
        y.set(sy || 0);
      } catch {}
    }
    setMounted(true);
  }, [x, y]);

  async function handleXanaOpen() {
    if (dragging) return; // block click during drag
    const token = await getAccessGroup();
    const response = await generateToken({ token: token.ifricdi, product_name: "XANA AI" });
    if (response?.data?.token) {
      const token2 = response.data.token;
      const xana_url =
        process.env.NEXT_PUBLIC_XANA_URL || "https://dev-xana.industryfusion-x.org";
      window.open(`${xana_url}?token=${token2}`, "_blank", "noopener,noreferrer");
    }
  }

  if (!isLoggedIn || !mounted) return null;

  return (
    <>
      <div
        ref={boundsRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}
      />
      <motion.button
        onClick={handleXanaOpen}
        className="xana-fab"
        style={{
          bottom: 20,
          right: 20,
          position: "fixed",
          x,
          y,
          opacity: dragging ? 0.5 : 1,
          pointerEvents: dragging ? "none" : "auto",
          cursor: dragging ? "grab" : "pointer",
        }}
        drag
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={boundsRef}
        onDragStart={() => setDragging(true)}
        onDragEnd={() => {
          setDragging(false);
          localStorage.setItem(
            "xanaFabXY",
            JSON.stringify({ x: x.get(), y: y.get() })
          );
        }}
      >
        <img src="/ai-audio.svg" alt="Xana" width={22} height={22} />
        <span className="xana-label">{t("xana_fab.ask_xana")}</span>
      </motion.button>
    </>
  );
}
