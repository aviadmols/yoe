if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');

        this.handleSlideChangedDebounced = debounce(this.handleSlideChanged.bind(this), 500);
        if (this.elements.viewer) {
          this.elements.viewer.addEventListener('slideChanged', this.handleSlideChangedDebounced);
        }

        if (this.elements.thumbnails) {
          this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
            mediaToSwitch
              .querySelector('button')
              .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
          });
          if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
        }

        this.mql.addEventListener('change', () => this.updateAwardOverlayVisibility());
        requestAnimationFrame(() => this.updateAwardOverlayVisibility());
      }

      handleSlideChanged(event) {
        if (this.elements.thumbnails && event.detail.currentElement?.dataset?.mediaId) {
          const thumbnail = this.elements.thumbnails.querySelector(
            `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
          );
          this.setActiveThumbnail(thumbnail);
        }
        this.updateAwardOverlayVisibility();
      }

      updateAwardOverlayVisibility() {
        const overlayRoot = this.querySelector('[data-award-overlay-root]');
        if (!overlayRoot) return;
        const coverId = this.dataset.awardCoverId;
        if (!coverId) return;
        const active = this.elements.viewer?.querySelector('.product__media-item.is-active');
        if (!active || active.hasAttribute('hidden')) {
          overlayRoot.classList.remove('award-overlay--visible');
          overlayRoot.setAttribute('aria-hidden', 'true');
          return;
        }
        const activeId = active.dataset.mediaId;
        const isDesktop = window.matchMedia('(min-width: 750px)').matches;
        const sectionId = this.dataset.sectionId;
        const customBgEl = sectionId && document.querySelector(`[data-custom-bg="${sectionId}"]`);
        if (customBgEl && !customBgEl.classList.contains('active')) {
          overlayRoot.classList.remove('award-overlay--visible');
          overlayRoot.setAttribute('aria-hidden', 'true');
          return;
        }
        const show = isDesktop && activeId === coverId;
        overlayRoot.classList.toggle('award-overlay--visible', show);
        overlayRoot.setAttribute('aria-hidden', show ? 'false' : 'true');
      }

      isMediaHiddenForCurrentViewport(media) {
        if (!media) return true;

        const isSmall = window.matchMedia('(max-width: 749px)').matches;
        const isMedium = window.matchMedia('(min-width: 750px) and (max-width: 989px)').matches;
        const isLarge = window.matchMedia('(min-width: 990px)').matches;

        return (
          media.classList.contains('product__media-item--variant') ||
          (isSmall && media.classList.contains('small-hide')) ||
          (isMedium && media.classList.contains('medium-hide')) ||
          (isLarge && media.classList.contains('large-up-hide'))
        );
      }

      getFirstAvailableMedia() {
        return Array.from(this.elements.viewer.querySelectorAll('[data-media-id]')).find((media) =>
          !this.isMediaHiddenForCurrentViewport(media)
        );
      }

      clearVariantMetafieldMedia() {
        const variantMetafieldMedia = this.elements.viewer.querySelector('.variant-metafield-media');
        if (!variantMetafieldMedia) return;

        variantMetafieldMedia.hidden = true;
        variantMetafieldMedia.classList.remove('is-active');
        variantMetafieldMedia.style.removeProperty('display');
      }

      setVariantMetafieldMedia(imageData) {
        const variantMetafieldMedia = this.elements.viewer.querySelector('.variant-metafield-media');
        const image = variantMetafieldMedia?.querySelector('.variant-metafield-media__image');
        if (!variantMetafieldMedia || !image || !imageData?.src) return;

        image.src = imageData.src;
        image.srcset = imageData.srcset || '';
        image.alt = imageData.alt || '';
        image.width = imageData.width || 1946;
        image.height = imageData.height || 1946;
        variantMetafieldMedia
          .querySelector('.product-media-container')
          ?.style.setProperty('--ratio', imageData.aspectRatio || 1.0);
        variantMetafieldMedia
          .querySelector('.product-media-container')
          ?.style.setProperty('--preview-ratio', imageData.aspectRatio || 1.0);

        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
          element.style.removeProperty('display');
        });

        variantMetafieldMedia.hidden = false;
        variantMetafieldMedia.classList.add('is-active');
        variantMetafieldMedia.style.setProperty('display', 'block', 'important');
        variantMetafieldMedia.parentElement.firstChild !== variantMetafieldMedia &&
          variantMetafieldMedia.parentElement.prepend(variantMetafieldMedia);
        if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        this.updateAwardOverlayVisibility();
      }

      setActiveMedia(mediaId, prepend) {
        const requestedMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`);
        this.clearVariantMetafieldMedia();
        const shouldUseRequestedMedia =
          requestedMedia && (prepend || !this.isMediaHiddenForCurrentViewport(requestedMedia));
        const activeMedia = shouldUseRequestedMedia ? requestedMedia : this.getFirstAvailableMedia();
        if (!activeMedia) {
          return;
        }
        const activeMediaId = activeMedia.dataset.mediaId;
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
          element.style.removeProperty('display');
        });
        activeMedia?.classList?.add('is-active');
        if (prepend && this.isMediaHiddenForCurrentViewport(activeMedia)) {
          activeMedia.style.setProperty('display', 'block', 'important');
        }

        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);

          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${activeMediaId}"]`);
            if (activeThumbnail) {
              activeThumbnail.parentElement.firstChild !== activeThumbnail &&
                activeThumbnail.parentElement.prepend(activeThumbnail);
            }
          }

          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }

        this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        this.playActiveMedia(activeMedia);
        this.updateAwardOverlayVisibility();

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${activeMediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        if (activeThumbnail) this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
