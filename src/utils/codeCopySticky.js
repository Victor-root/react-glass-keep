// Makes a code-block "copy" button follow the visible top of its block as
// the user scrolls a tall block — WITHOUT layout-thrashing.
//
// The naive version attached a `scroll` listener per code block whose
// handler ran several getBoundingClientRect()/offsetHeight reads on every
// scroll event. With many code blocks in one note that's dozens of forced
// reflows per scroll event (the "Forced reflow" DevTools flags), which
// makes scrolling a freshly-opened note janky.
//
// This version:
//   • coalesces scroll bursts into a single reposition per animation frame
//   • skips the (layout-reading) reposition entirely while the block is
//     off-screen, via an IntersectionObserver — so only the 1-2 visible
//     blocks ever read layout, regardless of how many blocks the note has.
//
// Returns a cleanup function (no-op if there's no scroll container).
export function attachStickyCopyButton(scrollEl, wrapper, btn) {
  if (!scrollEl) return () => {};
  // Only blocks TALLER than the visible area ever need the button to
  // follow the scroll (you spend time scrolling inside them). A block
  // that fits on screen never does, so skip all per-scroll work for it.
  // This is the big win for notes with many code blocks: most fit, so we
  // no longer attach a scroll listener + per-frame layout reads per block.
  const viewport = scrollEl.clientHeight || 0;
  if (viewport && wrapper.offsetHeight <= viewport) return () => {};

  const stickyHeader = scrollEl.querySelector(".sticky");
  let visible = false;
  let rafPending = false;

  const reposition = () => {
    if (!wrapper.isConnected || !visible) return;
    const headerBottom = stickyHeader
      ? stickyHeader.getBoundingClientRect().bottom
      : scrollEl.getBoundingClientRect().top;
    const wrapperTop = wrapper.getBoundingClientRect().top;
    const offset = headerBottom - wrapperTop;
    if (offset > 8) {
      const maxTop = wrapper.offsetHeight - btn.offsetHeight - 8;
      btn.style.top = `${Math.min(offset + 8, Math.max(8, maxTop))}px`;
    } else {
      btn.style.top = "8px";
    }
  };

  const onScroll = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      reposition();
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) reposition();
      else btn.style.top = "8px";
    },
    { root: scrollEl, rootMargin: "120px 0px" },
  );
  io.observe(wrapper);
  scrollEl.addEventListener("scroll", onScroll, { passive: true });
  reposition();

  return () => {
    io.disconnect();
    scrollEl.removeEventListener("scroll", onScroll);
  };
}
