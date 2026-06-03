export function startSpinner(label: string): () => void {
  if (!process.stderr.isTTY) {
    process.stderr.write(`${label}\n`);
    return () => {};
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let index = 0;
  const timer = setInterval(() => {
    index = (index + 1) % frames.length;
    process.stderr.write(`\r${frames[index]} ${label}`);
  }, 80);

  return () => {
    clearInterval(timer);
    process.stderr.write('\r\u001b[K');
  };
}
