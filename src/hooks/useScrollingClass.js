import { useEffect } from "react";

// Adds `gk-scrolling` to <html> while the window is actively scrolling and
// removes it ~160 ms after the last scroll event. This lets the CSS drop
// the per-card backdrop-blur during scroll — compositing blur(20px) for
// every visible glass card on each frame is the main scroll-jank source
// on weaker desktop GPUs (touch devices already disable it via media
// query). The frosted look returns as soon as scrolling settles.
export default function useScrollingClass() {
  useEffect(() => {
    const el = document.documentElement;
    let timeout = 0;
    let scrolling = false;
    const stop = () => {
      scrolling = false;
      el.classList.remove("gk-scrolling");
    };
    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        el.classList.add("gk-scrolling");
      }
      clearTimeout(timeout);
      timeout = window.setTimeout(stop, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
      el.classList.remove("gk-scrolling");
    };
  }, []);
}
