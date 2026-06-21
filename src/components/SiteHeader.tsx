export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="site-header__left">
          <a href="/" className="site-header__logo">
            Melody Seed Generator
          </a>
          <nav className="site-header__nav" aria-label="Main">
            <a href="#generator">Генератор мелодий</a>
            <a href="#instructions">Инструкция</a>
            <a href="#suno-tips">Советы для SUNO</a>
          </nav>
        </div>
        <a href="#support" className="site-header__support">
          Поддержать проект
        </a>
      </div>
    </header>
  );
}
