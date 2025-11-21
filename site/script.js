const animateMetric = (el) => {
  const target = Number(el.dataset.target || 0);
  const isInt = Number.isInteger(target);
  const duration = 1200;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const value = target * progress;
    el.textContent = isInt ? Math.round(value) : value.toFixed(1);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".metric-value").forEach(animateMetric);
});
