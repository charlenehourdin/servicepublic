// =========================================================
// service-public-demo — script commun
// =========================================================

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo — limite administrative

function formatTaille(octets){
  if(octets < 1024) return `${octets} o`;
  if(octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`;
}

// Cache des ressources statiques
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    const script = document.querySelector('script[src*="main.js"]');
    if(!script) return;
    const swUrl = new URL('../sw.js', script.src);
    navigator.serviceWorker.register(swUrl.href).catch(()=>{});
  });
}

function initZoneUpload(){
  const zone = document.querySelector('.zone-upload');
  const input = document.querySelector('#input-fichier');
  const liste = document.querySelector('.liste-fichiers');
  const infoPoids = document.querySelector('[data-poids-selection]');
  const alerte = document.querySelector('[data-alerte-upload]');
  if(!zone || !input || !liste) return;

  const fichiersAcceptes = [];

  zone.setAttribute('role', 'button');
  zone.setAttribute('tabindex', '0');
  zone.setAttribute('aria-controls', 'input-fichier');
  if(!zone.getAttribute('aria-label')){
    zone.setAttribute('aria-label', 'Sélectionner des fichiers à téléverser');
  }

  const ouvrir = ()=> input.click();
  zone.addEventListener('click', ouvrir);
  zone.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      ouvrir();
    }
  });

  function majResume(){
    const total = fichiersAcceptes.reduce((s, f)=> s + f.size, 0);
    if(infoPoids){
      infoPoids.textContent = fichiersAcceptes.length
        ? `${fichiersAcceptes.length} fichier(s) · ${formatTaille(total)} / max. ${formatTaille(TAILLE_MAX_OCTETS)} par fichier`
        : `Aucun fichier · max. ${formatTaille(TAILLE_MAX_OCTETS)} par fichier`;
    }
  }

  function afficherAlerte(msg){
    if(!alerte) return;
    alerte.hidden = !msg;
    alerte.textContent = msg || '';
  }

  function ajouterFichier(file){
    if(file.size > TAILLE_MAX_OCTETS){
      afficherAlerte(`« ${file.name} » refusé : ${formatTaille(file.size)} (limite ${formatTaille(TAILLE_MAX_OCTETS)}).`);
      return;
    }

    fichiersAcceptes.push(file);
    afficherAlerte('');

    const item = document.createElement('div');
    item.className = 'fichier-item';
    item.setAttribute('role', 'listitem');

    const nom = document.createElement('span');
    nom.className = 'nom';
    nom.textContent = `${file.name} — ${formatTaille(file.size)}`;

    const btn = document.createElement('button');
    btn.className = 'supprimer';
    btn.type = 'button';
    btn.setAttribute('aria-label', `Supprimer ${file.name}`);
    btn.textContent = '✕';
    btn.addEventListener('click', ()=>{
      const idx = fichiersAcceptes.indexOf(file);
      if(idx >= 0) fichiersAcceptes.splice(idx, 1);
      item.remove();
      majResume();
    });

    if(file.type.startsWith('image/')){
      const reader = new FileReader();
      reader.onload = (ev)=>{
        const img = new Image();
        img.onload = ()=>{
          const max = 160;
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          const miniature = document.createElement('img');
          miniature.className = 'miniature';
          miniature.alt = '';
          miniature.width = 54;
          miniature.height = 54;
          miniature.src = canvas.toDataURL('image/jpeg', 0.7);
          item.prepend(miniature);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }

    item.append(nom, btn);
    liste.appendChild(item);
    majResume();
  }

  input.addEventListener('change', (e)=>{
    Array.from(e.target.files).forEach(ajouterFichier);
    input.value = '';
  });

  majResume();
}
document.addEventListener('DOMContentLoaded', initZoneUpload);

function initEtapesAccessibilite(){
  document.querySelectorAll('.ecran-etape').forEach(ecran=>{
    const actif = ecran.classList.contains('actif');
    ecran.setAttribute('aria-hidden', actif ? 'false' : 'true');
    if(!actif) ecran.setAttribute('inert', '');
    else ecran.removeAttribute('inert');
  });
  document.querySelectorAll('.step').forEach(step=>{
    if(step.classList.contains('actif')) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
}
document.addEventListener('DOMContentLoaded', initEtapesAccessibilite);

function allerEtape(numero){
  document.querySelectorAll('.ecran-etape').forEach(e=>{
    e.classList.remove('actif');
    e.setAttribute('aria-hidden', 'true');
    e.setAttribute('inert', '');
  });
  const cible = document.querySelector(`#etape-${numero}`);
  if(cible){
    cible.classList.add('actif');
    cible.setAttribute('aria-hidden', 'false');
    cible.removeAttribute('inert');
    const titre = cible.querySelector('h2');
    if(titre){
      titre.setAttribute('tabindex', '-1');
      titre.focus({preventScroll:true});
    }
  }

  document.querySelectorAll('.step').forEach(step=>{
    const n = parseInt(step.dataset.step, 10);
    step.classList.remove('actif','fait');
    step.removeAttribute('aria-current');
    if(n < numero) step.classList.add('fait');
    if(n === numero){
      step.classList.add('actif');
      step.setAttribute('aria-current', 'step');
    }
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0, behavior: reduce ? 'auto' : 'smooth'});
}

function animerProgression(barre, callback){
  if(!barre){
    callback();
    return;
  }
  const wrap = barre.closest('[data-progress-wrap]') || barre.parentElement;
  if(wrap) wrap.hidden = false;
  barre.setAttribute('aria-valuenow', '0');
  barre.style.width = '0%';

  let p = 0;
  const tick = ()=>{
    p += 8 + Math.random() * 12;
    if(p >= 100){
      p = 100;
      barre.style.width = '100%';
      barre.setAttribute('aria-valuenow', '100');
      setTimeout(callback, 200);
      return;
    }
    barre.style.width = `${Math.round(p)}%`;
    barre.setAttribute('aria-valuenow', String(Math.round(p)));
    setTimeout(tick, 120);
  };
  tick();
}

function soumettreDossier(numeroDossierPrefix){
  const bouton = document.querySelector('#bouton-soumettre');
  const barre = document.querySelector('[data-progress-bar]');
  if(bouton){
    bouton.disabled = true;
    bouton.setAttribute('aria-busy', 'true');
    bouton.textContent = 'Envoi en cours…';
  }

  animerProgression(barre, ()=>{
    const numero = numeroDossierPrefix + '-' + Math.floor(100000 + Math.random()*900000);
    const champNumero = document.querySelector('[data-numero-dossier]');
    if(champNumero) champNumero.textContent = numero;
    allerEtape(99);
    const confirmation = document.querySelector('#etape-99');
    if(confirmation) confirmation.setAttribute('role', 'status');
  });
}
