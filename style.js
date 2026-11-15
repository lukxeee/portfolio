document.addEventListener("DOMContentLoaded", () => {
  /* ---------- 1. NAVIGATION (Home, About, Skills...) ---------- */
  const navLinks = document.querySelectorAll("nav a");
  const header = document.querySelector("header");

  // Give the home section an id so "Home" can scroll to it
  const homeSection = document.querySelector("section.home");
  if (homeSection && !homeSection.id) homeSection.id = "home";

  // Map the link text -> section id
  const linkTargets = {
    home: "home",
    about: "about",
    skills: "skills",
    education: "education",
    contact: "contact",
  };

  navLinks.forEach((link) => {
    const key = link.textContent.trim().toLowerCase();
    const targetId = linkTargets[key];
    if (!targetId) return;
    link.setAttribute("href", "#" + targetId);
    link.dataset.target = targetId;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(targetId);
    });
  });

  // Logo scrolls to top
  const logo = document.querySelector(".logo");
  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection("home");
    });
  }

  // "See My Work" button -> Skills section
  const workBtn = document.querySelector(".home-content .btn");
  if (workBtn) {
    workBtn.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection("skills");
    });
  }

  function scrollToSection(id) {
    // If the game isn't beaten yet, send people to the game instead
    if (id !== "home" && window.portfolioGame && window.portfolioGame.isLocked()) {
      window.portfolioGame.showLockedHint();
      id = "game";
    }
    const section = document.getElementById(id);
    if (!section) return;
    const offset = header ? header.offsetHeight + 20 : 0;
    const top =
      id === "home"
        ? 0
        : section.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  // Highlight the nav link of the section currently on screen
  function updateActiveLink() {
    const checkLine = window.scrollY + window.innerHeight / 3;
    let currentId = "home";
    Object.values(linkTargets).forEach((id) => {
      const sec = document.getElementById(id);
      // offsetParent is null when a section is hidden (locked)
      if (sec && sec.offsetParent !== null && sec.offsetTop <= checkLine) currentId = id;
    });
    navLinks.forEach((l) =>
      l.classList.toggle("active", l.dataset.target === currentId)
    );
  }
  window.addEventListener("scroll", updateActiveLink);
  updateActiveLink();

  /* ---------- 2. LOGIN / REGISTER ---------- */
  injectAuthStyles();
  injectAuthModal();

  const modal = document.getElementById("authModal");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const authTitle = document.getElementById("authTitle");
  const authSwitch = document.getElementById("authSwitch");
  const authButtons = document.querySelector(".auth-buttons");

  function openModal(mode) {
    showMode(mode);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    loginForm.reset();
    registerForm.reset();
    document.querySelectorAll(".auth-msg").forEach((m) => (m.textContent = ""));
  }
  function showMode(mode) {
    const isLogin = mode === "login";
    loginForm.style.display = isLogin ? "block" : "none";
    registerForm.style.display = isLogin ? "none" : "block";
    authTitle.textContent = isLogin ? "Login" : "Register";
    authSwitch.innerHTML = isLogin
      ? `No account yet? <a href="#" data-mode="register">Register</a>`
      : `Already have an account? <a href="#" data-mode="login">Login</a>`;
  }

  // Header buttons (they point to login.html / register.html, so we intercept them)
  const loginBtn = document.querySelector(".btn-login");
  const registerBtn = document.querySelector(".btn-register");
  loginBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal("login");
  });
  registerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal("register");
  });

  // Close modal: X button, click outside, or Escape key
  modal.querySelector(".auth-close").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Switch between login and register
  authSwitch.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-mode]");
    if (!a) return;
    e.preventDefault();
    showMode(a.dataset.mode);
  });

  // ----- Storage helpers (demo only: stored in this browser) -----
  const getUsers = () => JSON.parse(localStorage.getItem("users") || "[]");
  const saveUsers = (u) => localStorage.setItem("users", JSON.stringify(u));
  const getSession = () => localStorage.getItem("currentUser");

  async function hashPassword(pw) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(pw)
      );
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
    return btoa(unescape(encodeURIComponent(pw))); // fallback
  }

  // ----- Register -----
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = registerForm.querySelector(".auth-msg");
    const name = registerForm.regName.value.trim();
    const email = registerForm.regEmail.value.trim().toLowerCase();
    const pw = registerForm.regPassword.value;
    const pw2 = registerForm.regConfirm.value;

    msg.className = "auth-msg error";
    if (name.length < 2) return (msg.textContent = "Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email))
      return (msg.textContent = "Please enter a valid email.");
    if (pw.length < 6)
      return (msg.textContent = "Password must be at least 6 characters.");
    if (pw !== pw2) return (msg.textContent = "Passwords do not match.");

    const users = getUsers();
    if (users.some((u) => u.email === email))
      return (msg.textContent = "That email is already registered.");

    users.push({ name, email, password: await hashPassword(pw) });
    saveUsers(users);

    msg.className = "auth-msg success";
    msg.textContent = "Account created! You can now log in.";
    setTimeout(() => {
      registerForm.reset();
      showMode("login");
      loginForm.loginEmail.value = email;
    }, 1000);
  });

  // ----- Login -----
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = loginForm.querySelector(".auth-msg");
    const email = loginForm.loginEmail.value.trim().toLowerCase();
    const pw = await hashPassword(loginForm.loginPassword.value);

    const user = getUsers().find((u) => u.email === email && u.password === pw);
    msg.className = "auth-msg error";
    if (!user) return (msg.textContent = "Wrong email or password.");

    localStorage.setItem("currentUser", email);
    closeModal();
    renderAuthState();
  });

  // ----- Logged in / logged out header -----
  function renderAuthState() {
    const email = getSession();
    const user = email && getUsers().find((u) => u.email === email);

    if (user) {
      authButtons.innerHTML = `
        <span class="welcome">Hi, ${escapeHtml(user.name.split(" ")[0])}!</span>
        <a href="#" class="btn-register" id="logoutBtn">Logout</a>`;
      document.getElementById("logoutBtn").addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("currentUser");
        renderAuthState();
      });
    } else {
      authButtons.innerHTML = `
        <a href="#" class="btn-login">Login</a>
        <a href="#" class="btn-register">Register</a>`;
      authButtons.querySelector(".btn-login").addEventListener("click", (e) => {
        e.preventDefault();
        openModal("login");
      });
      authButtons
        .querySelector(".btn-register")
        .addEventListener("click", (e) => {
          e.preventDefault();
          openModal("register");
        });
    }
  }
  renderAuthState();

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
});

/* ---------- Modal HTML + CSS (injected so you don't need to edit them) ---------- */
function injectAuthModal() {
  const div = document.createElement("div");
  div.id = "authModal";
  div.className = "auth-overlay";
  div.innerHTML = `
    <div class="auth-box">
      <button class="auth-close" aria-label="Close">&times;</button>
      <h2 id="authTitle">Login</h2>

      <form id="loginForm" novalidate>
        <input type="email" name="loginEmail" placeholder="Email" required>
        <input type="password" name="loginPassword" placeholder="Password" required>
        <p class="auth-msg"></p>
        <button type="submit" class="auth-submit">Login</button>
      </form>

      <form id="registerForm" novalidate style="display:none">
        <input type="text" name="regName" placeholder="Full name" required>
        <input type="email" name="regEmail" placeholder="Email" required>
        <input type="password" name="regPassword" placeholder="Password (min 6 characters)" required>
        <input type="password" name="regConfirm" placeholder="Confirm password" required>
        <p class="auth-msg"></p>
        <button type="submit" class="auth-submit">Create Account</button>
      </form>

      <p class="auth-switch" id="authSwitch"></p>
    </div>`;
  document.body.appendChild(div);
}

function injectAuthStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;
      justify-content:center;align-items:center;z-index:1000;padding:20px}
    .auth-overlay.open{display:flex}
    .auth-box{position:relative;width:100%;max-width:380px;background:#0a0a0a;
      border:2px solid #1a1aff;border-radius:12px;padding:35px 28px;
      box-shadow:0 0 25px rgba(26,26,255,.5)}
    .auth-box h2{text-align:center;font-size:28px;margin-bottom:20px;color:#fff}
    .auth-close{position:absolute;top:10px;right:14px;background:none;color:#fff;
      font-size:28px;cursor:pointer;border:none}
    .auth-box input{width:100%;padding:12px 14px;margin-bottom:14px;background:#000;
      color:#fff;border:2px solid #1a1aff;border-radius:8px;font-size:15px}
    .auth-box input:focus{box-shadow:0 0 10px rgba(26,26,255,.6)}
    .auth-submit{width:100%;padding:12px;background:#0000ff;color:#fff;font-size:16px;
      font-weight:600;border:none;border-radius:8px;cursor:pointer;transition:.3s}
    .auth-submit:hover{background:#1a1aff;box-shadow:0 0 12px rgba(0,0,255,.6)}
    .auth-msg{min-height:20px;font-size:14px;margin-bottom:10px}
    .auth-msg.error{color:#ff6b6b}
    .auth-msg.success{color:#4cd964}
    .auth-switch{text-align:center;margin-top:16px;font-size:14px;color:#ccc}
    .auth-switch a{color:#8c8cff;font-weight:600}
    .welcome{font-size:15px;color:#fff}
  `;
  document.head.appendChild(style);
}
