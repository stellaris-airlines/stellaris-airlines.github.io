import { auth } from './firebase-config.js';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';

const guestElements = () => document.querySelectorAll('[data-auth-guest]');
const userElements = () => document.querySelectorAll('[data-auth-user]');
const logoutElements = () => document.querySelectorAll('[data-auth-logout]');

function renderGuest() {
  guestElements().forEach((element) => { element.hidden = false; });
  userElements().forEach((element) => { element.hidden = true; });
  logoutElements().forEach((element) => { element.hidden = true; });
}

function renderUser(user) {
  guestElements().forEach((element) => { element.hidden = true; });
  userElements().forEach((element) => {
    element.hidden = false;
    element.textContent = user.displayName || user.email || 'Stellaris Member';
  });
  logoutElements().forEach((element) => { element.hidden = false; });
}

await setPersistence(auth, browserLocalPersistence);
onAuthStateChanged(auth, (user) => {
  if (user) renderUser(user);
  else renderGuest();
});

logoutElements().forEach((element) => {
  element.addEventListener('click', async (event) => {
    event.preventDefault();
    await signOut(auth);
    window.location.assign(new URL('./', import.meta.url).href);
  });
});
