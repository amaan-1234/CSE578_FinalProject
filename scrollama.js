(() => {
  'use strict';

  const engageObservers = () => {
    const sectionObserver = scrollama();
    const titleObserver = scrollama();

    const triggerSectionActive = ({ element }) => {
      element.classList.remove('is-above');
      element.classList.add('is-active');
    };

    const triggerSectionInactive = ({ element, direction }) => {
      element.classList.remove('is-active');
      
      if (direction === 'down') {
        element.classList.add('is-above');
      } else {
        element.classList.remove('is-above');
      }
    };

    const triggerHeaderActive = ({ element }) => {
      element.classList.add('is-active');
    };

    sectionObserver
      .setup({
        step: '.scroll-section',
        offset: 0.6,
        debug: false,
      })
      .onStepEnter(triggerSectionActive)
      .onStepExit(triggerSectionInactive);

    titleObserver
      .setup({
        step: '.section-header',
        offset: 0.7,
        debug: false,
      })
      .onStepEnter(triggerHeaderActive);

    const handleResize = () => {
      sectionObserver.resize();
      titleObserver.resize();
    };

    window.addEventListener('resize', handleResize);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', engageObservers);
  } else {
    engageObservers();
  }
})();