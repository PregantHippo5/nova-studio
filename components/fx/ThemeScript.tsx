/**
 * Petit script exécuté avant le premier affichage :
 *  - applique le thème (choix sauvegardé, sinon réglage de l'appareil), donc pas de flash blanc ;
 *  - repère si l'intro a déjà été vue dans cette session, ou si l'utilisateur a coupé les animations.
 */
const code = `(function(){try{
var d=document.documentElement;
var s=localStorage.getItem('nova-theme');
var dark=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
d.classList.toggle('dark',dark);
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduce||sessionStorage.getItem('nova-intro')){d.classList.add('nova-seen');}
}catch(e){}})();`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
