(() => {
const stage = document.querySelector(".stage");
const fluidCanvas = document.querySelector("#fluidBackground");
const field = document.querySelector("#buttonField");
const introSplash = document.querySelector(".introSplash");
const introText = document.querySelector(".introText");
const introProgressLine = document.querySelector(".introProgressLine");
const loginPanel = document.querySelector(".loginPanel");
const signUpToggle = loginPanel.querySelector(".signUpToggle");
const signInToggle = loginPanel.querySelector(".signInToggle");
const signUpSubmit = loginPanel.querySelector(".signUpSubmit");
const authSignIn = loginPanel.querySelector(".authSignIn");
const authSignUp = loginPanel.querySelector(".authSignUp");
const authMessage = document.getElementById("authMessage");
const getAuthMessageHeight = () => {
  if (authMessage.hidden) {
    return 0;
  }

  const styles = getComputedStyle(authMessage);
  return authMessage.offsetHeight + (parseFloat(styles.marginBottom) || 0);
};
const updateAuthPanelHeight = () => {
  const activeView = loginPanel.classList.contains("isSignUp") ? authSignUp : authSignIn;
  const contentHeight = activeView.offsetHeight + getAuthMessageHeight();

  loginPanel.style.setProperty("--auth-height", `${contentHeight}px`);
};
const friendRequestList = document.getElementById("friendRequestList");
const centerSize = 132;
const minSize = 58;
const createdButtons = [];
const placedButtons = [];
const driftItems = [];
let profiles = [];
let myUserId = null;
const renderIntroText = () => {
  const text = introText.textContent.trim();

  introText.innerHTML = [...text]
    .map((letter, index) => {
      const className = letter === " " ? " class=\"introSpace\"" : "";
      const content = letter === " " ? "&nbsp;" : letter;

      return `<span${className} style="--letter-index: ${index}">${content}</span>`;
    })
    .join("");
};
const scatterQuadrants = [
  { xSign: -1, ySign: -1 },
  { xSign: 1, ySign: -1 },
  { xSign: -1, ySign: 1 },
  { xSign: 1, ySign: 1 },
];
const scatterRings = [
  { min: 24, max: 38 },
  { min: 48, max: 66 },
  { min: 76, max: 100 },
];
const stableNameHash = (name) =>
  [...name].reduce((hash, letter) => (hash * 31 + letter.charCodeAt(0)) % 9973, 7);
const shuffle = (items) =>
  [...items].sort(() => Math.random() - 0.5);
const makeScatterSlots = (count) => {
  const slots = [];

  for (let ringIndex = 0; slots.length < count; ringIndex += 1) {
    const ring = scatterRings[Math.min(ringIndex, scatterRings.length - 1)];
    const quadrants = shuffle(scatterQuadrants);

    quadrants.forEach((quadrant) => {
      if (slots.length >= count) {
        return;
      }

      const angle = ((18 + Math.random() * 54) * Math.PI) / 180;
      const distance = ring.min + Math.random() * (ring.max - ring.min);
      const dx = quadrant.xSign * Math.cos(angle) * distance * 1.12;
      const dy = quadrant.ySign * Math.sin(angle) * distance * 0.9;

      slots.push({
        x: clamp(50 + dx, -34, 134),
        y: clamp(50 + dy, -16, 116),
      });
    });
  }

  return slots;
};
const getSortedProfiles = () => {
  const sortMode = currentSortMode;
  const ownProfile = profiles[myProfileIndex];
  const people = profiles.filter((profile, index) => index !== myProfileIndex);

  if (sortMode === "Alphabetical") {
    people.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortMode === "Career Alignment") {
    people.sort((a, b) => a.industryInterest.localeCompare(b.industryInterest) || b.interactionFrequency - a.interactionFrequency);
  } else if (sortMode === "Random") {
    people.sort((a, b) => stableNameHash(a.name) - stableNameHash(b.name));
  } else {
    people.sort((a, b) => b.interactionFrequency - a.interactionFrequency);
  }

  return [ownProfile, ...people];
};

const makeInitials = (name) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return `<span class="bubbleInitials" aria-hidden="true">${initials}</span>`;
};
const makeProfile = ({ name, bio, university, company, industryInterest }) => `
  <span class="profileCard">
    <span class="profileContent">
      <span class="profileKicker">Profile</span>
      <span class="profileName">${name}</span>
      <span class="profileBio">${bio}</span>
      <span class="profileMeta">
        <span class="profileMetaItem">
          <svg class="profileMetaIcon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 9l9-4 9 4-9 4-9-4z" />
            <path d="M7 11v5c0 1.4 2.2 3 5 3s5-1.6 5-3v-5" />
          </svg>
          <span class="profileMetaValue">${university}</span>
        </span>
        <span class="profileMetaItem">
          <svg class="profileMetaIcon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4C14.2 4 15 4.8 15 5.8V7" />
            <path d="M5.5 8h13c1.1 0 2 .9 2 2v7.5c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2z" />
            <path d="M3.5 12.5h17" />
          </svg>
          <span class="profileMetaValue">${company}</span>
        </span>
        <span class="profileMetaItem">
          <svg class="profileMetaIcon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5z" />
          </svg>
          <span class="profileMetaValue">${industryInterest}</span>
        </span>
      </span>
    </span>
    <span class="profileActions">
      <span class="profileAction" role="button" tabindex="0" data-action-label="View selected">View</span>
      <span class="profileAction" role="button" tabindex="0" data-action-label="Message selected">Message</span>
      <span class="profileAction" role="button" tabindex="0" data-action-label="Save selected">Save</span>
    </span>
  </span>
`;
const handleProfileAction = (event) => {
  const action = event.target.closest(".profileAction");

  if (!action) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const card = action.closest(".profileCard");
  const kicker = card.querySelector(".profileKicker");

  card.querySelectorAll(".profileAction").forEach((item) => {
    item.classList.toggle("isActivated", item === action);
  });
  kicker.textContent = action.dataset.actionLabel;
};
const handleProfileActionKeydown = (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  handleProfileAction(event);
};

const addButton = ({ x, y, size, profile, center = false }) => {
  const button = document.createElement("button");
  const driftLimit = center ? 5 : clamp(size * 0.11, 5, 9);
  const driftSeed = Math.random() * Math.PI * 2;

  button.type = "button";
  button.className = `glassBtn${center ? " isCenter" : ""}`;
  button.setAttribute("aria-label", center ? `Open ${profile.name}` : `Open ${profile.name}`);
  button.style.setProperty("--tx", "0vw");
  button.style.setProperty("--ty", "0vh");
  button.style.setProperty("--scatter-scale", center ? "1" : "0.34");
  button.style.setProperty("--opacity", center ? "1" : "0");
  button.dataset.profileName = profile.name;
  button.dataset.txValue = String(x - 50);
  button.dataset.tyValue = String(y - 50);
  button.dataset.tx = `${x - 50}vw`;
  button.dataset.ty = `${y - 50}vh`;
  button.style.setProperty("--size", `${size}px`);
  button.style.setProperty("--icon-size", `${Math.max(14, size * 0.4)}px`);
  button.style.setProperty("--drift-x", "0px");
  button.style.setProperty("--drift-y", "0px");
  button.innerHTML = `${makeInitials(profile.name)}${makeProfile(profile)}`;
  button.querySelectorAll(".profileAction").forEach((action) => {
    action.addEventListener("click", handleProfileAction);
    action.addEventListener("keydown", handleProfileActionKeydown);
  });
  button.addEventListener("click", (event) => {
    if (button.classList.contains("isExpanded")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.stopPropagation();
    focusButton(button);
  });
  field.appendChild(button);
  createdButtons.push(button);
  placedButtons.push({ x, y, size });
  driftItems.push({
    button,
    x: 0,
    y: 0,
    seedX: driftSeed,
    seedY: driftSeed + Math.PI * (0.35 + Math.random() * 0.5),
    speedX: 0.00042 + Math.random() * 0.00018,
    speedY: 0.00032 + Math.random() * 0.00016,
    blend: 0,
    limit: driftLimit,
  });
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const sizeFromOffset = (dx, dy) => {
  const distance = clamp(Math.hypot(dx / 96, dy / 78), 0, 1);
  const falloff = 1 - distance * distance * (3 - 2 * distance);

  return Math.round(minSize + falloff * 52);
};

const searchBar = document.querySelector(".searchBar");
const searchInput = searchBar.querySelector("input");
const sortControl = document.querySelector("#sortControl");
const sortButton = sortControl.querySelector(".sortButton");
const sortValue = sortControl.querySelector(".sortValue");
const sortOptions = [...sortControl.querySelectorAll(".sortOption")];
let currentSortMode = sortValue.textContent.trim();
searchBar.addEventListener("submit", (event) => {
  event.preventDefault();
});
const filterControl = document.querySelector("#filterControl");
const filterToggle = filterControl.querySelector(".filterToggle");
const filterClose = filterControl.querySelector(".filterClose");
const addConnectionToggle = document.querySelector(".addConnectionToggle");
const addConnectionPanel = document.querySelector("#addConnectionPanel");
const addConnectionInput = addConnectionPanel.querySelector("input[name='connectionEmail']");
const debugToggle = document.querySelector(".debugToggle");
const debugPanel = document.querySelector("#debugPanel");
const settingsToggle = document.querySelector(".settingsToggle");
const settingsScrim = document.querySelector(".settingsScrim");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsSidebarButtons = [...settingsPanel.querySelectorAll(".settingsSidebar button")];
const settingsPages = [...settingsPanel.querySelectorAll(".settingsPage")];
const settingsSignOut = settingsPanel.querySelector(".settingsSignOut");
const myProfileToggle = document.querySelector(".myProfileToggle");
const myProfileCard = document.querySelector("#myProfileCard");
const myProfileClose = myProfileCard.querySelector(".myProfileClose");
const myProfileSave = myProfileCard.querySelector(".myProfileSave");
const myProfileTitle = myProfileCard.querySelector(".myProfileTitle");
const myProfileFields = {
  school: myProfileCard.elements.school,
  work: myProfileCard.elements.work,
  bio: myProfileCard.elements.bio,
  industryCategory: myProfileCard.elements.industryCategory,
  industrySpecialty: myProfileCard.elements.industrySpecialty,
};
const myProfileIndex = 0;
const industryCategories = [
  "Technology",
  "Business",
  "Finance",
  "Healthcare",
  "Biotechnology & Life Sciences",
  "Education",
  "Agriculture",
  "Environmental Sustainability",
  "Energy",
  "Manufacturing",
  "Construction & Infrastructure",
  "Transportation & Logistics",
  "Real Estate",
  "Retail & E-commerce",
  "Consumer Goods",
  "Hospitality & Tourism",
  "Law & Policy",
  "Government & Public Service",
  "Security & Defense",
  "Social Work",
  "Nonprofit",
  "Media & Communications",
  "Fine Arts",
  "Design",
  "Academia",
  "Sports & Entertainment",
];
const industrySpecialties = {
  Technology: [
    "Full Stack Engineering",
    "Front End Engineering",
    "Back End Engineering",
    "Mobile Engineering",
    "Data Analyst",
    "Data Science",
    "Data Engineering",
    "Data Platforms",
    "Machine Learning Engineering",
    "AI Research",
    "Knowledge Graphs",
    "Systems Engineer",
    "Cloud Infrastructure",
    "DevOps / Site Reliability",
    "Cybersecurity",
    "Product Management",
    "Productivity Tools",
    "UX / UI Design",
    "Technical Program Management",
    "Game Development",
    "AR / VR Engineering",
    "Embedded Systems",
    "Robotics",
    "Blockchain Engineering",
    "Database Engineering",
    "QA Automation",
    "Developer Relations",
    "IT Support",
  ],
  Business: [
    "Product Strategy",
    "Startup Operations",
    "Business Development",
    "Go-to-Market Strategy",
    "Sales Strategy",
    "Marketing",
    "Brand Strategy",
    "Customer Success",
    "Operations Management",
    "Human Resources",
    "Talent Matching",
    "Management Consulting",
    "Entrepreneurship",
    "Venture Networks",
  ],
  Finance: [
    "Investment Banking",
    "Private Equity",
    "Venture Capital",
    "Asset Management",
    "Quantitative Finance",
    "Financial Planning",
    "Corporate Finance",
    "FinTech",
    "Risk Management",
    "Accounting",
    "Insurance",
    "Real Estate Finance",
  ],
  Healthcare: [
    "Clinical Medicine",
    "Nursing",
    "Public Health",
    "Healthcare Administration",
    "HealthTech",
    "Mental Health",
    "Pharmacy",
    "Medical Research",
    "Health Policy",
    "Patient Experience",
    "Epidemiology",
  ],
  "Biotechnology & Life Sciences": [
    "Biotech Research",
    "Genomics",
    "Drug Discovery",
    "Bioinformatics",
    "Clinical Trials",
    "Medical Devices",
    "Synthetic Biology",
    "Neuroscience",
    "Immunology",
    "Regulatory Affairs",
    "Lab Operations",
  ],
  Education: [
    "Teaching",
    "EdTech",
    "Curriculum Design",
    "Learning Science",
    "Student Networks",
    "Alumni Networks",
    "Career Design",
    "Academic Advising",
    "Education Policy",
    "K-12 Education",
    "Higher Education",
    "Online Learning",
  ],
  Agriculture: [
    "Crop Science",
    "AgTech",
    "Food Systems",
    "Sustainable Farming",
    "Animal Science",
    "Agricultural Economics",
    "Soil Science",
    "Precision Agriculture",
    "Food Safety",
    "Supply Chain",
  ],
  "Environmental Sustainability": [
    "Climate Tech",
    "Conservation",
    "Environmental Policy",
    "Carbon Markets",
    "Circular Economy",
    "Water Resources",
    "Sustainable Design",
    "Waste Management",
    "ESG Strategy",
    "Urban Sustainability",
  ],
  Energy: [
    "Renewable Energy",
    "Solar",
    "Wind",
    "Grid Modernization",
    "Energy Storage",
    "Oil & Gas",
    "Nuclear Energy",
    "Energy Markets",
    "Hydrogen",
    "Energy Policy",
  ],
  Manufacturing: [
    "Industrial Engineering",
    "Supply Chain",
    "Quality Control",
    "Process Engineering",
    "Automation",
    "Lean Manufacturing",
    "Materials Science",
    "Factory Operations",
    "Hardware Production",
    "Procurement",
  ],
  "Construction & Infrastructure": [
    "Civil Engineering",
    "Architecture",
    "Urban Planning",
    "Construction Management",
    "Transportation Infrastructure",
    "Real Estate Development",
    "Structural Engineering",
    "Smart Cities",
    "Public Works",
    "Sustainable Buildings",
  ],
  "Transportation & Logistics": [
    "Logistics Operations",
    "Supply Chain Analytics",
    "Mobility Tech",
    "Autonomous Vehicles",
    "Aviation",
    "Maritime Logistics",
    "Rail Systems",
    "Last-Mile Delivery",
    "Fleet Management",
    "Warehouse Operations",
  ],
  "Real Estate": [
    "Commercial Real Estate",
    "Residential Real Estate",
    "Real Estate Development",
    "Property Management",
    "Urban Development",
    "Real Estate Investment",
    "Facilities Management",
    "PropTech",
    "Affordable Housing",
  ],
  "Retail & E-commerce": [
    "E-commerce Operations",
    "Merchandising",
    "Retail Strategy",
    "Marketplace Platforms",
    "Growth Marketing",
    "Customer Experience",
    "Inventory Planning",
    "DTC Brands",
    "Omnichannel Retail",
  ],
  "Consumer Goods": [
    "Brand Management",
    "Product Innovation",
    "Consumer Insights",
    "CPG Operations",
    "Food & Beverage",
    "Beauty & Personal Care",
    "Packaging",
    "Category Management",
    "Retail Partnerships",
  ],
  "Hospitality & Tourism": [
    "Hotel Management",
    "Travel Operations",
    "Event Planning",
    "Restaurant Management",
    "Guest Experience",
    "Tourism Strategy",
    "Luxury Hospitality",
    "Food Service",
    "Venue Operations",
  ],
  "Law & Policy": [
    "Corporate Law",
    "Intellectual Property",
    "Public Policy",
    "Legal Tech",
    "Compliance",
    "International Law",
    "Civil Rights",
    "Criminal Justice",
    "Regulatory Policy",
    "Contract Law",
  ],
  "Government & Public Service": [
    "Public Administration",
    "Civic Technology",
    "Urban Policy",
    "International Development",
    "Public Finance",
    "Diplomacy",
    "Emergency Management",
    "Community Programs",
    "Economic Development",
  ],
  "Security & Defense": [
    "National Security",
    "Defense Technology",
    "Cyber Defense",
    "Intelligence Analysis",
    "Aerospace Defense",
    "Risk Analysis",
    "Emergency Response",
    "Security Operations",
    "Policy Strategy",
  ],
  "Social Work": [
    "Community",
    "Community Outreach",
    "Case Management",
    "Youth Services",
    "Mental Health Support",
    "Family Services",
    "Housing Support",
    "Crisis Intervention",
    "Social Impact",
    "Advocacy",
  ],
  Nonprofit: [
    "Fundraising",
    "Program Management",
    "Grant Writing",
    "Impact Measurement",
    "Philanthropy",
    "Volunteer Coordination",
    "Community Platforms",
    "Nonprofit Operations",
    "Social Enterprise",
  ],
  "Media & Communications": [
    "Journalism",
    "Content Strategy",
    "Public Relations",
    "Film & Video",
    "Podcasting",
    "Social Media",
    "Advertising",
    "Publishing",
    "Broadcast Media",
    "Strategic Communications",
  ],
  "Fine Arts": [
    "Visual Arts",
    "Music",
    "Theater",
    "Dance",
    "Creative Writing",
    "Art History",
    "Museum Curation",
    "Photography",
    "Film Arts",
    "Art Education",
  ],
  Design: [
    "Product Design",
    "Graphic Design",
    "Interaction Design",
    "Service Design",
    "Industrial Design",
    "Design Research",
    "Motion Design",
    "Interior Design",
    "Fashion Design",
    "Brand Design",
  ],
  Academia: [
    "Research",
    "Teaching",
    "STEM Research",
    "Humanities",
    "Social Sciences",
    "Lab Management",
    "Academic Publishing",
    "Grant Research",
    "Data Methods",
    "Graduate Studies",
  ],
  "Sports & Entertainment": [
    "Sports Management",
    "Athlete Development",
    "Esports",
    "Music Business",
    "Film Production",
    "Live Events",
    "Talent Management",
    "Entertainment Marketing",
    "Game Publishing",
    "Media Rights",
  ],
};
const technologySpecialties = industrySpecialties.Technology;
const profileDropdowns = [...myProfileCard.querySelectorAll(".profileDropdown")];
const industryCategoryDropdown = myProfileCard.querySelector('[data-profile-dropdown="category"]');
const industrySpecialtyDropdown = myProfileCard.querySelector('[data-profile-dropdown="specialty"]');
let myProfileIndustryDirty = false;
const closeProfileDropdowns = (exceptDropdown = null) => {
  profileDropdowns.forEach((dropdown) => {
    if (dropdown === exceptDropdown) {
      return;
    }

    dropdown.classList.remove("isOpen");
    dropdown.querySelector(".profileDropdownButton").setAttribute("aria-expanded", "false");
  });
};
const getProfileDropdownField = (dropdown) =>
  dropdown.dataset.profileDropdown === "category"
    ? myProfileFields.industryCategory
    : myProfileFields.industrySpecialty;
const setProfileDropdownValue = (dropdown, value) => {
  dropdown.dataset.value = value;
  dropdown.querySelector(".profileDropdownValue").textContent = value;
  getProfileDropdownField(dropdown).value = value;
  dropdown.querySelectorAll(".profileDropdownOption").forEach((option) => {
    const isSelected = option.dataset.value === value;

    option.classList.toggle("isSelected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
};
const selectProfileDropdownValue = (dropdown, value, dirty = true) => {
  if (dropdown === industryCategoryDropdown) {
    setProfileDropdownValue(industryCategoryDropdown, value);
    renderIndustrySpecialties(value, undefined);
  } else {
    setProfileDropdownValue(industrySpecialtyDropdown, value);
  }

  if (dirty) {
    myProfileIndustryDirty = true;
  }

  closeProfileDropdowns();
};
const renderProfileDropdownOptions = (dropdown, options) => {
  const menu = dropdown.querySelector(".profileDropdownMenu");

  menu.replaceChildren();
  options.forEach((value) => {
    const option = document.createElement("button");

    option.type = "button";
    option.className = "profileDropdownOption";
    option.dataset.value = value;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.textContent = value;
    option.addEventListener("click", () => selectProfileDropdownValue(dropdown, value));
    option.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      event.preventDefault();
      const optionItems = [...menu.querySelectorAll(".profileDropdownOption")];
      const currentIndex = optionItems.indexOf(option);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + direction + optionItems.length) % optionItems.length;

      optionItems[nextIndex].focus();
    });
    menu.appendChild(option);
  });
};
const getIndustrySpecialties = (category) =>
  industrySpecialties[category] || ["General"];
const renderIndustrySpecialties = (category, preferredSpecialty) => {
  const specialties = getIndustrySpecialties(category);
  const specialtyButton = industrySpecialtyDropdown.querySelector(".profileDropdownButton");

  industrySpecialtyDropdown.classList.remove("isDisabled");
  specialtyButton.disabled = false;
  renderProfileDropdownOptions(industrySpecialtyDropdown, specialties);
  setProfileDropdownValue(
    industrySpecialtyDropdown,
    specialties.includes(preferredSpecialty) ? preferredSpecialty : specialties[0],
  );
};
const inferIndustrySelection = (profile) => {
  if (profile.industryCategory) {
    const specialties = getIndustrySpecialties(profile.industryCategory);

    return {
      category: profile.industryCategory,
      specialty: specialties.includes(profile.industrySpecialty)
        ? profile.industrySpecialty
        : specialties[0],
    };
  }

  const interest = profile.industryInterest || "Technology";

  for (const category of industryCategories) {
    const prefix = `${category} / `;

    if (interest.startsWith(prefix)) {
      const specialty = interest.slice(prefix.length);
      const specialties = getIndustrySpecialties(category);

      return {
        category,
        specialty: specialties.includes(specialty) ? specialty : specialties[0],
      };
    }
  }

  if (industryCategories.includes(interest)) {
    const specialties = getIndustrySpecialties(interest);

    return {
      category: interest,
      specialty: specialties[0],
    };
  }

  for (const category of industryCategories) {
    const specialties = getIndustrySpecialties(category);

    if (specialties.includes(interest)) {
      return {
        category,
        specialty: interest,
      };
    }
  }

  return {
    category: "Technology",
    specialty: technologySpecialties[0],
  };
};
const getSelectedIndustryInterest = () => {
  const category = myProfileFields.industryCategory.value || "Technology";
  const specialty = myProfileFields.industrySpecialty.value;

  return specialty ? `${category} / ${specialty}` : category;
};
const universitySearchCache = new Map();
const universityMenus = new WeakMap();
const universityTimers = new WeakMap();
const universityControllers = new WeakMap();
const universityKeywordPattern = /\b(university|college|school|institute|academy|polytechnic|conservatory|seminary|campus|université|universität|universidad)\b/i;
const isLikelyUniversity = (item) =>
  universityKeywordPattern.test(`${item.label || ""} ${item.description || ""}`);
const markUniversitySelection = (input, suggestion) => {
  input.value = suggestion.name;
  input.dataset.wikidataId = suggestion.id;
  input.dataset.acceptedUniversityName = suggestion.name;
  input.setCustomValidity("");
};
const validateUniversitySelection = (input) => {
  const value = input.value.trim();
  const isSelectedSuggestion = Boolean(input.dataset.wikidataId)
    && input.dataset.acceptedUniversityName === value;

  input.setCustomValidity(isSelectedSuggestion ? "" : "Choose a university from the suggestions.");
  return isSelectedSuggestion;
};
const fetchUniversitySuggestions = async (query, signal) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (universitySearchCache.has(normalizedQuery)) {
    return universitySearchCache.get(normalizedQuery);
  }

  const params = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    origin: "*",
    language: "en",
    uselang: "en",
    type: "item",
    limit: "10",
    search: query,
  });
  const response = await fetch(`https://www.wikidata.org/w/api.php?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error("University search failed");
  }

  const data = await response.json();
  const names = new Set();
  const suggestions = (data.search || [])
    .filter(isLikelyUniversity)
    .map((item) => ({
      id: item.id,
      name: item.label,
      description: item.description || "University",
    }))
    .filter((item) => {
      const key = item.name.toLowerCase();

      if (names.has(key)) {
        return false;
      }

      names.add(key);
      return true;
    })
    .slice(0, 6);

  universitySearchCache.set(normalizedQuery, suggestions);
  return suggestions;
};
const closeUniversitySuggestions = (input) => {
  const menu = universityMenus.get(input);

  if (!menu) {
    return;
  }

  menu.classList.remove("isOpen");
  menu.replaceChildren();
};
const closeAllUniversitySuggestions = (exceptInput = null) => {
  [myProfileFields.school, debugPanel.elements.university].forEach((input) => {
    if (input !== exceptInput) {
      closeUniversitySuggestions(input);
    }
  });
};
const renderUniversitySuggestions = (input, suggestions, message = "") => {
  const menu = universityMenus.get(input);

  if (!menu) {
    return;
  }

  menu.replaceChildren();

  if (!suggestions.length) {
    const status = document.createElement("span");

    status.className = "universitySuggestionStatus";
    status.textContent = message || "No university matches";
    menu.appendChild(status);
    menu.classList.add("isOpen");
    return;
  }

  suggestions.forEach((suggestion) => {
    const option = document.createElement("button");
    const name = document.createElement("span");
    const detail = document.createElement("span");

    option.type = "button";
    option.className = "universitySuggestionOption";
    option.setAttribute("role", "option");
    option.dataset.wikidataId = suggestion.id;
    name.textContent = suggestion.name;
    detail.textContent = suggestion.description;
    option.append(name, detail);
    option.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    option.addEventListener("click", () => {
      markUniversitySelection(input, suggestion);
      closeUniversitySuggestions(input);
      input.focus();
    });
    option.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }

      event.preventDefault();
      const options = [...menu.querySelectorAll(".universitySuggestionOption")];
      const index = options.indexOf(option);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + direction + options.length) % options.length;

      options[nextIndex].focus();
    });
    menu.appendChild(option);
  });
  menu.classList.add("isOpen");
};
const requestUniversitySuggestions = (input) => {
  const query = input.value.trim();

  window.clearTimeout(universityTimers.get(input));
  universityControllers.get(input)?.abort();

  if (query.length < 2) {
    closeUniversitySuggestions(input);
    return;
  }

  const timer = window.setTimeout(async () => {
    const controller = new AbortController();

    universityControllers.set(input, controller);
    renderUniversitySuggestions(input, [], "Searching universities...");

    try {
      const suggestions = await fetchUniversitySuggestions(query, controller.signal);

      if (input.value.trim() !== query) {
        return;
      }

      renderUniversitySuggestions(input, suggestions);
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }

      renderUniversitySuggestions(input, [], "Network search unavailable");
    }
  }, 240);

  universityTimers.set(input, timer);
};
const setupUniversityAutocomplete = (input) => {
  const menu = document.createElement("span");

  menu.className = "universitySuggestionMenu";
  menu.setAttribute("role", "listbox");
  menu.setAttribute("aria-label", "University suggestions");
  input.autocomplete = "off";
  input.parentElement.classList.add("hasUniversitySuggestions");
  input.insertAdjacentElement("afterend", menu);
  universityMenus.set(input, menu);
  input.addEventListener("input", () => {
    input.removeAttribute("data-wikidata-id");
    input.removeAttribute("data-accepted-university-name");
    input.setCustomValidity("Choose a university from the suggestions.");
    requestUniversitySuggestions(input);
  });
  input.addEventListener("focus", () => {
    requestUniversitySuggestions(input);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") {
      return;
    }

    const firstOption = menu.querySelector(".universitySuggestionOption");

    if (!firstOption) {
      return;
    }

    event.preventDefault();
    firstOption.focus();
  });
  input.addEventListener("blur", () => {
    window.setTimeout(() => closeUniversitySuggestions(input), 130);
  });
};
renderProfileDropdownOptions(industryCategoryDropdown, industryCategories);
renderIndustrySpecialties("Technology", technologySpecialties[0]);
profileDropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector(".profileDropdownButton");

  button.addEventListener("click", () => {
    if (button.disabled) {
      return;
    }

    const isOpen = !dropdown.classList.contains("isOpen");

    closeProfileDropdowns(dropdown);
    dropdown.classList.toggle("isOpen", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
  });
  button.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();
    closeProfileDropdowns(dropdown);
    dropdown.classList.add("isOpen");
    button.setAttribute("aria-expanded", "true");
    dropdown.querySelector(".profileDropdownOption.isSelected")?.focus();
  });
});
setupUniversityAutocomplete(myProfileFields.school);
setupUniversityAutocomplete(debugPanel.elements.university);
const showAuthMessage = (text, isError = false) => {
  if (!text) {
    authMessage.hidden = true;
    authMessage.textContent = "";
    updateAuthPanelHeight();
    return;
  }

  authMessage.hidden = false;
  authMessage.textContent = text;
  authMessage.classList.toggle("isError", isError);
  authMessage.classList.toggle("isSuccess", !isError);
  requestAnimationFrame(updateAuthPanelHeight);
};
const renderFriendRequests = async () => {
  friendRequestList.replaceChildren();

  try {
    const requests = await NetworkAPI.getPendingIncomingRequests();

    if (!requests.length) {
      const empty = document.createElement("span");
      empty.className = "friendRequestEmpty";
      empty.textContent = "No pending requests";
      friendRequestList.appendChild(empty);
      return;
    }

    requests.forEach((request) => {
      const name = request.requester?.display_name || "User";
      const card = document.createElement("div");
      card.className = "friendRequestCard";
      card.innerHTML = `
        <span class="requestAvatar" aria-hidden="true">${name[0]?.toUpperCase() || "?"}</span>
        <span class="requestInfo">
          <span>${name}</span>
        </span>
        <button type="button" class="acceptRequest">Accept</button>
      `;
      card.querySelector(".acceptRequest").addEventListener("click", async () => {
        const button = card.querySelector(".acceptRequest");
        button.disabled = true;
        const { error } = await NetworkAPI.respondConnectionRequest(request.id, "accepted");

        if (error) {
          button.disabled = false;
          alert(error.message);
          return;
        }

        button.textContent = "Accepted";
        button.classList.add("isAccepted");

        const loaded = await NetworkAPI.loadNetwork();
        profiles.length = 0;
        profiles.push(...loaded);

        if (appStarted) {
          renderProfileBubbles();
        }
      });
      friendRequestList.appendChild(card);
    });
  } catch (error) {
    friendRequestList.textContent = error.message;
  }
};
const closeAddConnectionPanel = () => {
  addConnectionPanel.classList.remove("isOpen");
  addConnectionToggle.setAttribute("aria-expanded", "false");
};
const closeDebugPanel = () => {
  debugPanel.classList.remove("isOpen");
  debugToggle.setAttribute("aria-expanded", "false");
};
const closeSettings = () => {
  stage.classList.remove("hasSettings");
  settingsToggle.setAttribute("aria-expanded", "false");
};
const openSettings = () => {
  closeAddConnectionPanel();
  closeDebugPanel();
  closeSortMenu();
  closeMyProfile();
  clearFocus();
  stopPanInertia();
  stage.classList.add("hasSettings");
  settingsToggle.setAttribute("aria-expanded", "true");
  settingsPanel.querySelector(".settingsSidebar button")?.focus();
};
const closeSortMenu = () => {
  sortControl.classList.remove("isOpen");
  sortButton.setAttribute("aria-expanded", "false");
};

const updateProfileButton = (button, profile) => {
  if (!button) {
    return;
  }

  button.setAttribute("aria-label", `Open ${profile.name}`);
  button.dataset.profileName = profile.name;
  button.querySelector(".bubbleInitials").outerHTML = makeInitials(profile.name);
  button.querySelector(".profileName").textContent = profile.name;
  button.querySelector(".profileBio").textContent = profile.bio;

  const metaItems = button.querySelectorAll(".profileMetaValue");
  metaItems[0].textContent = profile.university;
  metaItems[1].textContent = profile.company;
  metaItems[2].textContent = profile.industryInterest;
};
const syncMyProfileForm = () => {
  const profile = profiles[myProfileIndex];
  const industrySelection = inferIndustrySelection(profile);

  myProfileTitle.textContent = profile.name;
  myProfileFields.school.value = profile.university;
  myProfileFields.school.dataset.wikidataId = profile.universityWikidataId || "existing-profile-school";
  myProfileFields.school.dataset.acceptedUniversityName = profile.university;
  myProfileFields.school.setCustomValidity("");
  myProfileFields.work.value = profile.company;
  myProfileFields.bio.value = profile.bio;
  setProfileDropdownValue(industryCategoryDropdown, industrySelection.category);
  renderIndustrySpecialties(industrySelection.category, industrySelection.specialty);
  myProfileIndustryDirty = false;
};
const saveMyProfile = async () => {
  const profile = profiles[myProfileIndex];

  if (!validateUniversitySelection(myProfileFields.school)) {
    myProfileFields.school.reportValidity();
    return false;
  }

  profile.university = myProfileFields.school.value.trim() || profile.university;
  profile.universityWikidataId = myProfileFields.school.dataset.wikidataId;
  profile.company = myProfileFields.work.value.trim() || profile.company;
  profile.bio = myProfileFields.bio.value.trim() || profile.bio;

  if (myProfileIndustryDirty) {
    profile.industryCategory = myProfileFields.industryCategory.value || "Technology";
    profile.industrySpecialty = myProfileFields.industrySpecialty.value;
    profile.industryInterest = getSelectedIndustryInterest();
    myProfileIndustryDirty = false;
  }

  if (myUserId) {
    const { error } = await NetworkAPI.updateMyProfile(myUserId, profile);

    if (error) {
      alert(error.message);
      return false;
    }
  }

  updateProfileButton(createdButtons[myProfileIndex], profile);
  applySearch();
  return true;
};

filterToggle.addEventListener("click", () => {
  const isExpanded = filterControl.classList.toggle("isExpanded");

  filterToggle.setAttribute("aria-expanded", String(isExpanded));
});
filterClose.addEventListener("click", () => {
  filterControl.classList.remove("isExpanded");
  filterToggle.setAttribute("aria-expanded", "false");
  filterToggle.focus();
});
addConnectionToggle.addEventListener("click", () => {
  const isOpen = addConnectionPanel.classList.toggle("isOpen");

  addConnectionToggle.setAttribute("aria-expanded", String(isOpen));
  closeDebugPanel();
  closeSettings();

  if (isOpen) {
    renderFriendRequests();
    addConnectionInput.focus();
  }
});
addConnectionPanel.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = addConnectionInput.value.trim();

  if (!email) {
    return;
  }

  const { error } = await NetworkAPI.sendConnectionRequestByEmail(email);

  if (error) {
    alert(error.message);
    return;
  }

  addConnectionInput.value = "";
  addConnectionInput.focus();
});
debugToggle.addEventListener("click", () => {
  const isOpen = debugPanel.classList.toggle("isOpen");

  debugToggle.setAttribute("aria-expanded", String(isOpen));
  closeAddConnectionPanel();
  closeSettings();

  if (isOpen) {
    debugPanel.elements.name.focus();
  }
});
settingsToggle.addEventListener("click", () => {
  if (stage.classList.contains("hasSettings")) {
    closeSettings();
    return;
  }

  openSettings();
});
settingsScrim.addEventListener("click", closeSettings);
settingsSidebarButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetPanel = button.dataset.settingsTab;

    settingsSidebarButtons.forEach((item) => {
      item.classList.toggle("isSelected", item === button);
    });
    settingsPages.forEach((page) => {
      page.classList.toggle("isActive", page.dataset.settingsPanel === targetPanel);
    });
  });
});
debugPanel.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = debugPanel.elements.name.value.trim();
  const bio = debugPanel.elements.bio.value.trim();
  const university = debugPanel.elements.university.value.trim();
  const company = debugPanel.elements.company.value.trim();
  const industryInterest = debugPanel.elements.industryInterest.value.trim();
  const interactionFrequency = Number(debugPanel.elements.interactionFrequency.value);

  if (!name || !bio || !university || !company || !industryInterest || !validateUniversitySelection(debugPanel.elements.university)) {
    debugPanel.reportValidity();
    return;
  }

  profiles.push({
    name,
    bio,
    university,
    universityWikidataId: debugPanel.elements.university.dataset.wikidataId,
    company,
    industryInterest,
    interactionFrequency: Number.isFinite(interactionFrequency)
      ? clamp(interactionFrequency, 0, 100)
      : 0,
  });

  debugPanel.reset();
  debugPanel.elements.university.removeAttribute("data-wikidata-id");
  debugPanel.elements.university.removeAttribute("data-accepted-university-name");
  debugPanel.elements.university.setCustomValidity("");
  debugPanel.elements.interactionFrequency.value = "70";

  if (appStarted) {
    renderProfileBubbles();
  }

  debugPanel.elements.name.focus();
});
const openMyProfile = () => {
  syncMyProfileForm();
  myProfileCard.classList.add("isOpen");
  myProfileToggle.setAttribute("aria-expanded", "true");
};
const closeMyProfile = () => {
  myProfileCard.classList.remove("isOpen");
  myProfileToggle.setAttribute("aria-expanded", "false");
  closeProfileDropdowns();
};
myProfileToggle.addEventListener("click", () => {
  if (myProfileCard.classList.contains("isOpen")) {
    closeMyProfile();
    return;
  }

  openMyProfile();
});
myProfileClose.addEventListener("click", () => {
  closeMyProfile();
  myProfileToggle.focus();
});
myProfileCard.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!(await saveMyProfile())) {
    return;
  }

  myProfileSave.textContent = "Saved";

  window.setTimeout(() => {
    myProfileSave.textContent = "Save";
  }, 900);
});

let panX = 0;
let panY = 0;
let startX = 0;
let startY = 0;
let startPanX = 0;
let startPanY = 0;
let isDragging = false;
let didDrag = false;
let lastPointerX = 0;
let lastPointerY = 0;
let lastPointerTime = 0;
let velocityX = 0;
let velocityY = 0;
let inertiaFrame = 0;
let lastInertiaTime = 0;
let driftFrame = 0;
let lastDriftTime = 0;
let activeButton = null;
let appStarted = false;
let canvasScale = 1;
let zoomEndTimer = 0;
const minCanvasScale = 0.56;
const maxCanvasScale = 2.6;
const focusScale = 1.34;
const maxInertiaIdleMs = 90;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getPanBounds = () => ({
  x: window.innerWidth * 1.36,
  y: window.innerHeight * 1.12,
});
const stopPanInertia = () => {
  if (!inertiaFrame) {
    return;
  }

  cancelAnimationFrame(inertiaFrame);
  inertiaFrame = 0;
};
const startPanInertia = () => {
  if (prefersReducedMotion || activeButton) {
    return;
  }

  if (performance.now() - lastPointerTime > maxInertiaIdleMs) {
    velocityX = 0;
    velocityY = 0;
    return;
  }

  const speed = Math.hypot(velocityX, velocityY);

  if (speed < 0.18) {
    return;
  }

  stage.classList.add("isPanning");
  lastInertiaTime = performance.now();

  const step = (time) => {
    const delta = Math.min(32, time - lastInertiaTime);

    lastInertiaTime = time;
    setPan(panX + velocityX * delta, panY + velocityY * delta);

    const decay = Math.pow(0.86, delta / 16.67);
    velocityX *= decay;
    velocityY *= decay;

    if (Math.hypot(velocityX, velocityY) < 0.02) {
      inertiaFrame = 0;
      stage.classList.remove("isPanning");
      return;
    }

    inertiaFrame = requestAnimationFrame(step);
  };

  inertiaFrame = requestAnimationFrame(step);
};
const runBubbleDrift = (time = performance.now()) => {
  if (prefersReducedMotion || !appStarted) {
    driftFrame = 0;
    return;
  }

  const delta = Math.min(48, time - lastDriftTime || 16.67);
  const ease = 1 - Math.pow(0.9, delta / 16.67);

  lastDriftTime = time;
  driftItems.forEach((item) => {
    if (!item.button.isConnected || item.button.classList.contains("isExpanded") || !item.button.classList.contains("isSettled")) {
      return;
    }

    item.blend = Math.min(1, item.blend + delta / 900);

    const targetX = (
      Math.sin(time * item.speedX + item.seedX) * 0.62 +
      Math.sin(time * item.speedX * 0.37 + item.seedY) * 0.38
    ) * item.limit * item.blend;
    const targetY = (
      Math.cos(time * item.speedY + item.seedY) * 0.58 +
      Math.sin(time * item.speedY * 0.43 + item.seedX) * 0.42
    ) * item.limit * item.blend;

    item.x += (targetX - item.x) * ease;
    item.y += (targetY - item.y) * ease;
    item.button.style.setProperty("--drift-x", `${item.x.toFixed(2)}px`);
    item.button.style.setProperty("--drift-y", `${item.y.toFixed(2)}px`);
  });
  driftFrame = requestAnimationFrame(runBubbleDrift);
};
const startBubbleDrift = () => {
  if (driftFrame || prefersReducedMotion) {
    return;
  }

  lastDriftTime = performance.now();
  driftFrame = requestAnimationFrame(runBubbleDrift);
};
const setupFluidBackground = () => {
  const gl = fluidCanvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    fluidCanvas.hidden = true;
    return null;
  }

  const vertexSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;

    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p = mat2(1.72, -1.08, 1.08, 1.72) * p + 11.7;
        amplitude *= 0.5;
      }

      return value;
    }

    float softBlob(vec2 p, vec2 center, vec2 size) {
      vec2 d = (p - center) / size;
      return exp(-dot(d, d));
    }

    void main() {
      vec2 uv = vUv;
      float t = uTime;

      vec2 farP = uv;
      vec2 midP = uv;
      vec2 nearP = uv;

      float slowFlow = fbm(farP * 2.45 + vec2(t * 0.035, -t * 0.026));
      float grainFlow = fbm(midP * 5.0 + vec2(-t * 0.045, t * 0.032));
      float curve = 0.54
        + sin(midP.y * 3.25 + t * 0.32) * 0.09
        + sin(midP.y * 7.4 - t * 0.2) * 0.032
        + (slowFlow - 0.5) * 0.12;

      float ribbon = exp(-pow((midP.x - curve) / 0.07, 2.0));
      float innerEdge = exp(-pow((midP.x - curve - 0.065) / 0.038, 2.0));
      float upperDark = softBlob(midP, vec2(curve - 0.09, 0.28), vec2(0.22, 0.2));
      float lowerDark = softBlob(midP, vec2(curve + 0.03, 0.76), vec2(0.18, 0.27));
      float warmRight = softBlob(nearP, vec2(0.95, 0.62), vec2(0.34, 0.58));
      float warmLow = softBlob(nearP, vec2(0.82, 0.95), vec2(0.28, 0.26));
      float leftMass = softBlob(farP, vec2(0.12, 0.54), vec2(0.58, 0.82));

      vec3 leftColor = vec3(0.31, 0.25, 0.22);
      vec3 midColor = vec3(0.46, 0.37, 0.32);
      vec3 darkColor = vec3(0.085, 0.052, 0.048);
      vec3 warmColor = vec3(0.82, 0.58, 0.45);

      float sideWarmth = smoothstep(
        0.43,
        1.04,
        uv.x + sin(uv.y * 2.7 + t * 0.18) * 0.065 + (slowFlow - 0.5) * 0.11
      );
      float darkMix = clamp(ribbon * 0.62 + innerEdge * 0.34 + upperDark * 0.35 + lowerDark * 0.5, 0.0, 0.88);
      float warmMix = clamp(warmRight * 0.48 + warmLow * 0.2, 0.0, 0.68);

      vec3 color = mix(leftColor, warmColor, sideWarmth * 0.72);
      color = mix(color, midColor, leftMass * 0.26);
      color = mix(color, darkColor, darkMix);
      color = mix(color, warmColor, warmMix);
      color += (grainFlow - 0.5) * 0.045;

      float vignette = 1.0 - smoothstep(0.36, 0.92, length((uv - 0.5) * vec2(1.08, 0.92)));
      color *= 0.84 + vignette * 0.2;
      color = pow(color, vec3(0.92));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

  if (!vertexShader || !fragmentShader) {
    fluidCanvas.hidden = true;
    return null;
  }

  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(gl.getProgramInfoLog(program));
    fluidCanvas.hidden = true;
    return null;
  }

  const positionBuffer = gl.createBuffer();
  const positionLocation = gl.getAttribLocation(program, "aPosition");
  const resolutionLocation = gl.getUniformLocation(program, "uResolution");
  const timeLocation = gl.getUniformLocation(program, "uTime");

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const width = Math.max(1, Math.floor(fluidCanvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(fluidCanvas.clientHeight * dpr));

    if (fluidCanvas.width !== width || fluidCanvas.height !== height) {
      fluidCanvas.width = width;
      fluidCanvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionLocation, width, height);
  };
  const render = (time = 0) => {
    resize();
    gl.useProgram(program);
    gl.uniform1f(timeLocation, time * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!prefersReducedMotion) {
      requestAnimationFrame(render);
    }
  };

  resize();

  return { render, resize };
};
const setPan = (x, y) => {
  const bounds = getPanBounds();

  panX = clamp(x, -bounds.x, bounds.x);
  panY = clamp(y, -bounds.y, bounds.y);
  field.style.setProperty("--pan-x", `${panX}px`);
  field.style.setProperty("--pan-y", `${panY}px`);
};
const applyCanvasScale = (scale) => {
  field.style.setProperty("--canvas-scale", String(scale));
};
const setCanvasScale = (scale) => {
  canvasScale = clamp(scale, minCanvasScale, maxCanvasScale);
  applyCanvasScale(Number(canvasScale.toFixed(3)));
};
const isUiTarget = (target) =>
  target.closest(".loginPanel, .sortControl, .filterControl, .quickActions, .addConnectionPanel, .debugPanel, .settingsPanel, .settingsScrim, .myProfileToggle, .myProfileCard, .searchBar, input, textarea, select, .glassBtn");
const isControlTarget = (target) =>
  target.closest(".loginPanel, .sortControl, .filterControl, .quickActions, .addConnectionPanel, .debugPanel, .settingsPanel, .settingsScrim, .myProfileToggle, .myProfileCard, .searchBar, input, textarea, select");
const zoomCanvas = (event) => {
  if (!appStarted || activeButton || isControlTarget(event.target)) {
    return;
  }

  stopPanInertia();
  event.preventDefault();
  stage.classList.add("isZooming");
  window.clearTimeout(zoomEndTimer);
  zoomEndTimer = window.setTimeout(() => {
    stage.classList.remove("isZooming");
  }, 160);

  const previousScale = canvasScale;
  const zoomFactor = Math.exp(-event.deltaY * 0.001);
  const nextScale = clamp(previousScale * zoomFactor, minCanvasScale, maxCanvasScale);

  if (nextScale === previousScale) {
    return;
  }

  const viewportX = event.clientX - window.innerWidth / 2;
  const viewportY = event.clientY - window.innerHeight / 2;
  const contentX = (viewportX - panX) / previousScale;
  const contentY = (viewportY - panY) / previousScale;

  setCanvasScale(nextScale);
  setPan(viewportX - contentX * nextScale, viewportY - contentY * nextScale);
};
const focusButton = (button) => {
  if (activeButton === button) {
    return;
  }

  stopPanInertia();
  if (activeButton) {
    activeButton.classList.remove("isExpanded");
  }

  activeButton = button;
  button.style.setProperty("--drift-x", "0px");
  button.style.setProperty("--drift-y", "0px");
  const activeDrift = driftItems.find((item) => item.button === button);

  if (activeDrift) {
    activeDrift.x = 0;
    activeDrift.y = 0;
    activeDrift.blend = 0;
  }
  stage.classList.add("hasFocusCard");
  createdButtons.forEach((item) => {
    item.classList.toggle("isDimmed", item !== button);
  });

  const txPx = (Number(button.dataset.txValue) / 100) * window.innerWidth;
  const tyPx = (Number(button.dataset.tyValue) / 100) * window.innerHeight;

  applyCanvasScale(focusScale);
  setPan(-txPx * focusScale, -tyPx * focusScale);
  button.classList.add("isExpanded");
};
const clearFocus = () => {
  if (!activeButton) {
    return;
  }

  const txPx = (Number(activeButton.dataset.txValue) / 100) * window.innerWidth;
  const tyPx = (Number(activeButton.dataset.tyValue) / 100) * window.innerHeight;

  activeButton.classList.remove("isExpanded");
  activeButton = null;
  stage.classList.remove("hasFocusCard");
  createdButtons.forEach((button) => {
    button.classList.remove("isDimmed");
  });
  applyCanvasScale(canvasScale);
  setPan(-txPx * canvasScale, -tyPx * canvasScale);
};
const applySearch = () => {
  const query = searchInput.value.trim().toLowerCase();

  if (activeButton && query && !activeButton.dataset.profileName.toLowerCase().includes(query)) {
    clearFocus();
  }

  createdButtons.forEach((button) => {
    const isMatch = !query || button.dataset.profileName.toLowerCase().includes(query);

    button.classList.toggle("isSearchHidden", !isMatch);
    button.setAttribute("aria-hidden", String(!isMatch));
  });
};
const renderProfileBubbles = () => {
  const sortedProfiles = getSortedProfiles();
  const slots = makeScatterSlots(sortedProfiles.length - 1);

  stopPanInertia();
  if (activeButton) {
    activeButton.classList.remove("isExpanded");
    activeButton = null;
    stage.classList.remove("hasFocusCard");
  }

  createdButtons.length = 0;
  placedButtons.length = 0;
  driftItems.length = 0;
  field.innerHTML = "";
  canvasScale = 1;
  applyCanvasScale(1);
  setPan(0, 0);
  addButton({ x: 50, y: 50, size: centerSize, profile: sortedProfiles[0], center: true });

  slots.forEach((slot, index) => {
    const profile = sortedProfiles[index + 1];

    if (!profile) {
      return;
    }

    addButton({
      x: slot.x,
      y: slot.y,
      size: sizeFromOffset(slot.x - 50, slot.y - 50),
      profile,
    });
  });

  requestAnimationFrame(() => {
    createdButtons.forEach((button, index) => {
      button.style.transitionDelay = button.classList.contains("isCenter")
        ? "0ms"
        : `${80 + index * 34}ms`;
      button.style.setProperty("--tx", button.dataset.tx);
      button.style.setProperty("--ty", button.dataset.ty);
      button.style.setProperty("--scatter-scale", "1");
      button.style.setProperty("--opacity", "1");
    });
  });

  window.setTimeout(() => {
    createdButtons.forEach((button) => {
      button.style.transitionDelay = "0ms";
      button.classList.add("isSettled");
    });
    startBubbleDrift();
  }, 1200);
  applySearch();
};
const launchApp = async () => {
  if (appStarted) {
    return;
  }

  try {
    myUserId = await NetworkAPI.getUserId();
    const loaded = await NetworkAPI.loadNetwork();

    profiles.length = 0;
    profiles.push(...loaded);

    if (!profiles.length) {
      throw new Error("Could not load your profile.");
    }
  } catch (error) {
    showAuthMessage(error.message, true);
    return;
  }

  appStarted = true;
  activeButton = null;
  canvasScale = 1;
  stage.classList.remove("isAuthPending");
  stage.classList.add("isAppReady");
  closeMyProfile();
  closeAddConnectionPanel();
  closeDebugPanel();
  closeSettings();
  searchInput.value = "";
  authMessage.hidden = true;
  renderProfileBubbles();
};

searchInput.addEventListener("input", applySearch);
sortButton.addEventListener("click", () => {
  const isOpen = sortControl.classList.toggle("isOpen");

  sortButton.setAttribute("aria-expanded", String(isOpen));
});
sortOptions.forEach((option) => {
  option.addEventListener("click", () => {
    currentSortMode = option.dataset.sortValue;
    sortValue.textContent = currentSortMode;
    sortOptions.forEach((item) => {
      const isSelected = item === option;

      item.classList.toggle("isSelected", isSelected);
      item.setAttribute("aria-selected", String(isSelected));
    });
    closeSortMenu();

    if (!appStarted) {
      return;
    }

    renderProfileBubbles();
  });
});
sortButton.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown") {
    return;
  }

  event.preventDefault();
  sortControl.classList.add("isOpen");
  sortButton.setAttribute("aria-expanded", "true");
  sortOptions.find((option) => option.classList.contains("isSelected"))?.focus();
});
sortOptions.forEach((option, index) => {
  option.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + sortOptions.length) % sortOptions.length;

    sortOptions[nextIndex].focus();
  });
});
sortControl.addEventListener("focusout", (event) => {
  if (sortControl.contains(event.relatedTarget)) {
    return;
  }

  closeSortMenu();
});
loginPanel.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = loginPanel.querySelector("[name='username']").value.trim();
  const password = loginPanel.querySelector("[name='password']").value;

  showAuthMessage("");
  const { error } = await NetworkAPI.signIn(email, password);

  if (error) {
    showAuthMessage(error.message, true);
    return;
  }

  await launchApp();
});
const setAuthMode = (mode) => {
  const isSignUp = mode === "signup";

  loginPanel.classList.toggle("isSignUp", isSignUp);
  authSignIn.setAttribute("aria-hidden", String(isSignUp));
  authSignUp.setAttribute("aria-hidden", String(!isSignUp));
  authSignIn.querySelectorAll("input").forEach((input) => {
    input.disabled = isSignUp;
  });
  authSignUp.querySelectorAll("input").forEach((input) => {
    input.disabled = !isSignUp;
  });
  updateAuthPanelHeight();
};
const signOut = async () => {
  await NetworkAPI.signOut();
  myUserId = null;
  appStarted = false;
  stopPanInertia();
  closeAddConnectionPanel();
  closeDebugPanel();
  closeSortMenu();
  closeSettings();
  closeMyProfile();

  if (activeButton) {
    activeButton.classList.remove("isExpanded");
    activeButton = null;
  }

  createdButtons.length = 0;
  placedButtons.length = 0;
  driftItems.length = 0;
  field.innerHTML = "";
  searchInput.value = "";
  canvasScale = 1;
  applyCanvasScale(1);
  setPan(0, 0);
  stage.classList.remove("isAppReady", "hasFocusCard", "isPanning", "isZooming");
  stage.classList.add("isAuthPending");
  setAuthMode("signin");
  profiles.length = 0;
  loginPanel.querySelector("[name='username']")?.focus();
};
signUpToggle.addEventListener("click", () => {
  setAuthMode("signup");
  loginPanel.querySelector("[name='signupUsername']")?.focus();
});
signInToggle.addEventListener("click", () => {
  setAuthMode("signin");
  loginPanel.querySelector("[name='username']")?.focus();
});
signUpSubmit.addEventListener("click", async () => {
  const displayName = loginPanel.querySelector("[name='signupUsername']").value.trim();
  const email = loginPanel.querySelector("[name='signupEmail']").value.trim();
  const password = loginPanel.querySelector("[name='signupPassword']").value;
  const confirmPassword = loginPanel.querySelector("[name='signupConfirmPassword']").value;

  if (password !== confirmPassword) {
    showAuthMessage("Passwords do not match.", true);
    return;
  }

  showAuthMessage("");
  const { data, error } = await NetworkAPI.signUp(email, password, displayName);

  if (error) {
    showAuthMessage(error.message, true);
    return;
  }

  if (!data.session) {
    showAuthMessage("Account created. Check your email to confirm, then sign in.", false);
    setAuthMode("signin");
    return;
  }

  await launchApp();
});
settingsSignOut.addEventListener("click", signOut);
updateAuthPanelHeight();
setAuthMode("signin");

stage.addEventListener("pointerdown", (event) => {
  if (!appStarted) {
    return;
  }

  if (isUiTarget(event.target)) {
    return;
  }

  stopPanInertia();
  isDragging = true;
  startX = event.clientX;
  startY = event.clientY;
  startPanX = panX;
  startPanY = panY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  lastPointerTime = performance.now();
  velocityX = 0;
  velocityY = 0;
  didDrag = false;
  stage.classList.add("isPanning");
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener("pointermove", (event) => {
  if (!isDragging) {
    return;
  }

  event.preventDefault();
  didDrag = true;
  const now = performance.now();
  const deltaTime = Math.max(1, now - lastPointerTime);
  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  const movement = Math.hypot(dx, dy);

  if (movement < 0.5) {
    velocityX *= 0.2;
    velocityY *= 0.2;
  } else {
    velocityX = velocityX * 0.35 + (dx / deltaTime) * 0.65;
    velocityY = velocityY * 0.35 + (dy / deltaTime) * 0.65;
  }
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  lastPointerTime = now;
  setPan(startPanX + event.clientX - startX, startPanY + event.clientY - startY);
});
stage.addEventListener("wheel", zoomCanvas, { passive: false });
const fluidBackground = setupFluidBackground();

renderIntroText();

if (fluidBackground) {
  fluidBackground.render(0);
  window.addEventListener("resize", fluidBackground.resize);
}

let introFinished = false;
const finishIntro = async () => {
  if (introFinished) {
    return;
  }

  introFinished = true;
  stage.classList.remove("isIntro");
  introSplash.hidden = true;

  const session = await NetworkAPI.getSession();

  if (session) {
    await launchApp();
    return;
  }

  loginPanel.querySelector("input")?.focus();
};

if (prefersReducedMotion) {
  window.setTimeout(finishIntro, 300);
} else {
  introProgressLine?.addEventListener("animationend", finishIntro, { once: true });
  window.setTimeout(finishIntro, 4600);
}

const stopPanning = (event) => {
  if (!isDragging) {
    return;
  }

  isDragging = false;
  stage.classList.remove("isPanning");

  if (stage.hasPointerCapture(event.pointerId)) {
    stage.releasePointerCapture(event.pointerId);
  }

  if (didDrag && event.type === "pointerup") {
    startPanInertia();
  }
};

stage.addEventListener("pointerup", stopPanning);
stage.addEventListener("pointercancel", stopPanning);
window.addEventListener("resize", () => setPan(panX, panY));
window.addEventListener("resize", updateAuthPanelHeight);
document.addEventListener(
  "click",
  (event) => {
    const clickedAddConnection = event.target.closest(".addConnectionPanel, .addConnectionToggle");
    const clickedDebug = event.target.closest(".debugPanel, .debugToggle");
    const clickedSort = event.target.closest(".sortControl");
    const clickedProfileDropdown = event.target.closest(".profileDropdown");
    const clickedUniversitySuggest = event.target.closest(".hasUniversitySuggestions");

    if (!clickedSort) {
      closeSortMenu();
    }

    if (!clickedProfileDropdown) {
      closeProfileDropdowns();
    }

    if (!clickedUniversitySuggest) {
      closeAllUniversitySuggestions();
    }

    if (!clickedAddConnection) {
      closeAddConnectionPanel();
    }

    if (!clickedDebug) {
      closeDebugPanel();
    }
  },
  true,
);
stage.addEventListener("click", (event) => {
  if (!didDrag && (event.target === stage || event.target === field)) {
    closeMyProfile();
    clearFocus();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAddConnectionPanel();
    closeDebugPanel();
    closeSortMenu();
    closeSettings();
    closeMyProfile();
    clearFocus();
  }
});
})();
