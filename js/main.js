    // Year in footer
    document.getElementById('footerYear').textContent = '2005–' + new Date().getFullYear();

    // Mobile nav toggle
    const toggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('navMobile');
    const iconMenu = document.getElementById('iconMenu');
    const iconClose = document.getElementById('iconClose');

    toggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      iconMenu.style.display = isOpen ? 'none' : 'block';
      iconClose.style.display = isOpen ? 'block' : 'none';
    });

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        iconMenu.style.display = 'block';
        iconClose.style.display = 'none';
      });
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');

    function updateActiveLink() {
      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) current = section.getAttribute('id');
      });
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', updateActiveLink, { passive: true });

    // Scroll animations (IntersectionObserver)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // ---- Medición de conversiones (GA4) ----
    // Helper: dispara un evento solo si gtag está cargado
    function track(eventName, params) {
      if (typeof gtag === 'function') gtag('event', eventName, params || {});
    }

    // Clics en teléfono → conversión "llamada"
    document.querySelectorAll('a[href^="tel:"]').forEach(link => {
      link.addEventListener('click', () => {
        track('contacto_llamada', { metodo: 'telefono', destino: link.getAttribute('href') });
      });
    });

    // Clics en WhatsApp → conversión "whatsapp"
    document.querySelectorAll('a[data-wa="true"]').forEach(link => {
      link.addEventListener('click', () => {
        track('contacto_whatsapp', { metodo: 'whatsapp' });
      });
    });

    // ---- Formulario de contacto ----
    const form = document.getElementById('contactForm');

    const formMsg = document.getElementById('formMsg');

    // Muestra un mensaje de resultado debajo del título del formulario
    function showMsg(texto, ok) {
      if (!formMsg) { alert(texto); return; }
      formMsg.textContent = texto;
      formMsg.className = 'form-msg show ' + (ok ? 'ok' : 'err');
    }

    // Valida los campos obligatorios; devuelve {ok, nombre, telefono, email, mensaje}
    function readForm() {
      const nombre = document.getElementById('nombre').value.trim();
      const telefono = document.getElementById('telefono').value.trim();
      const email = document.getElementById('email').value.trim();
      const mensaje = document.getElementById('mensaje').value.trim();

      if (!nombre || !telefono || !email || !mensaje) {
        showMsg('Por favor completa todos los campos obligatorios (*) antes de enviar.', false);
        return { ok: false };
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        showMsg('Por favor ingresa un correo electrónico válido.', false);
        return { ok: false };
      }
      return { ok: true, nombre, telefono, email, mensaje };
    }

    // Si volvemos de un POST sin JS (contacto.php redirige con ?enviado / ?error)
    if (form) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('enviado') === '1') showMsg('Gracias, recibimos tu solicitud. Te contactaremos a la brevedad.', true);
      else if (params.get('error') === '1') showMsg('No pudimos enviar el correo. Intenta por WhatsApp o llámanos.', false);
    }

    // Envío por AJAX a contacto.php (PHP del hosting). Sin recargar la página.
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const data = readForm();
        if (!data.ok) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; }
        showMsg('Enviando…', true);

        fetch(form.getAttribute('action'), {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
          body: new FormData(form)
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res.ok) {
            showMsg(res.mensaje || 'Gracias, recibimos tu solicitud.', true);
            form.reset();
            track('envio_formulario', { metodo: 'formulario' });
          } else {
            showMsg(res.mensaje || 'No pudimos enviar el correo. Intenta por WhatsApp o llámanos.', false);
          }
        })
        .catch(function() {
          showMsg('Hubo un problema de conexión. Intenta por WhatsApp o llámanos.', false);
        })
        .finally(function() {
          if (submitBtn) { submitBtn.disabled = false; }
        });
      });
    }

    // Envío por WhatsApp: arma el mensaje con los datos del formulario
    const waBtn = document.getElementById('waSubmit');
    if (waBtn) {
      waBtn.addEventListener('click', function() {
        const data = readForm();
        if (!data.ok) return;
        const texto =
          'Hola DEPSA, los contacto desde su sitio web para cotizar un proyecto de demolición.%0A%0A' +
          'Nombre: ' + encodeURIComponent(data.nombre) + '%0A' +
          'Teléfono: ' + encodeURIComponent(data.telefono) + '%0A' +
          'Email: ' + encodeURIComponent(data.email) + '%0A' +
          'Proyecto: ' + encodeURIComponent(data.mensaje);
        track('envio_formulario', { metodo: 'whatsapp' });
        track('contacto_whatsapp', { metodo: 'whatsapp_formulario' });
        window.open('https://wa.me/56994966531?text=' + texto, '_blank', 'noopener');
      });
    }

    // Lightbox de la galería (galeria.html)
    const galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
    const lightbox = document.getElementById('lightbox');
    if (galleryItems.length && lightbox) {
      const lbImg = lightbox.querySelector('.lightbox-img');
      const lbCap = lightbox.querySelector('.lightbox-caption');
      const lbDesc = lightbox.querySelector('.lightbox-desc');
      const lbCount = lightbox.querySelector('.lightbox-count');
      let current = 0;

      function showItem(index) {
        current = (index + galleryItems.length) % galleryItems.length;
        const item = galleryItems[current];
        lightbox.classList.remove('has-error');
        lbImg.src = item.getAttribute('data-src') || '';
        lbImg.alt = item.getAttribute('data-caption') || '';
        if (lbCap) lbCap.textContent = item.getAttribute('data-caption') || '';
        if (lbDesc) lbDesc.textContent = item.getAttribute('data-desc') || '';
        if (lbCount) lbCount.textContent = (current + 1) + ' / ' + galleryItems.length;
      }
      function openLightbox(index) {
        showItem(index);
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
      function closeLightbox() {
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      // Si la foto aún no existe, muestra el placeholder en vez de imagen rota
      lbImg.addEventListener('error', function() { lightbox.classList.add('has-error'); });

      galleryItems.forEach(function(item, i) {
        item.addEventListener('click', function() { openLightbox(i); });
      });

      lightbox.addEventListener('click', function(e) {
        if (e.target.hasAttribute('data-lb-close')) closeLightbox();
        else if (e.target.closest('[data-lb-prev]')) showItem(current - 1);
        else if (e.target.closest('[data-lb-next]')) showItem(current + 1);
      });

      document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') showItem(current - 1);
        else if (e.key === 'ArrowRight') showItem(current + 1);
      });
    }
