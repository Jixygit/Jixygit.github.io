const startHour = 7, endHour = 19;
const days = 7;
const grid = document.getElementById("grid");

// convert 24h → "7:00 AM" style
function formatTime12h(h){
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return hour + ":00 " + period;
}


// calculate actual slot height including gap
function getSlotHeight(){
  const slot = document.querySelector(".slot");
  if(!slot) return 60;
  const styles = getComputedStyle(slot);
  const gap = parseInt(styles.marginBottom) || 8;
  return slot.offsetHeight + gap;
}

let data = JSON.parse(localStorage.getItem("scheduleData")) || [
  {day:2,start:11,end:13,title:"IT 2207",teacher:"J. Urbiso",room:"AV 303b"},
  {day:2,start:16,end:19,title:"IT 2207",teacher:"J. Urbiso",room:"CL 1b"},
  {day:3,start:7,end:9,title:"GEM",teacher:"E. Santos",room:"OL"},
  {day:3,start:9,end:11,title:"IT 2206",teacher:"D. Palma",room:"AV 303b"},
  {day:3,start:16,end:19,title:"IT 2210",teacher:"J. Dela Cruz",room:"AV 405b"},
  {day:4,start:8,end:9,title:"IT 2208",teacher:"J. Violanta",room:"AV 305b"},
  {day:4,start:9,end:11,title:"IT 2210",teacher:"J. Dela Cruz",room:"AV 303b"},
  {day:4,start:13,end:15,title:"IT 2211",teacher:"J. Ludovice",room:"AV 303b"},
  {day:4,start:15,end:17,title:"PE 4",teacher:"New PE Teacher",room:"PE Room 4"},
  {day:5,start:8,end:9,title:"IT 2209",teacher:"M. Abonite",room:"AV 305b"},
  {day:5,start:11,end:13,title:"IT 2208",teacher:"J. Violanta",room:"AV 406b"},
  {day:5,start:14,end:15,title:"GEM",teacher:"E. Santos",room:"LU 12b"},
  {day:5,start:16,end:19,title:"IT 2211",teacher:"J. Ludovice",room:"CL 1b"},
  {day:6,start:7,end:10,title:"IT 2206",teacher:"D. Palma",room:"CL Oreta b"},
  {day:6,start:13,end:15,title:"IT 2209",teacher:"M. Abonite",room:"AV 408b"},
];

let active = null;

function render() {
  // remove old time labels and slots
  grid.querySelectorAll(".time,.slot,.class").forEach(e => e.remove());

  // build grid
  for (let h = startHour; h < endHour; h++) {
    grid.insertAdjacentHTML("beforeend", `<div class="time">${formatTime12h(h)}</div>`);

    for (let d = 1; d <= days; d++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.dataset.day = d;
      slot.dataset.hour = h;

      slot.ondragover = e => e.preventDefault();
      slot.ondrop = () => {
        if (active) {
          const duration = active.end - active.start;
          active.day = d;
          active.start = h;
          active.end = h + duration;
          save();
        }
      };

      grid.appendChild(slot);
    }
  }

  const slotHeight = getSlotHeight();

  // render classes
  data.forEach((c, i) => {
    const slot = document.querySelector(`.slot[data-day="${c.day}"][data-hour="${c.start}"]`);
    if (!slot) return;

    const el = document.createElement("div");
    el.className = "class";
    el.draggable = true;

    // height based on hours spanned
    const contentMinHeight = 80;
    el.style.height = Math.max((c.end - c.start) * slotHeight - 8, contentMinHeight) + "px";

    // class content
    el.innerHTML = `
      <div class="class-content">
        <div>
          <div class="title">${c.title}</div>
          <div class="meta">${c.teacher}</div>
          <div class="meta">${c.room}</div>
          <div class="meta">${formatTime12h(c.start)} – ${formatTime12h(c.end)}</div>
        </div>
      </div>
    `;

    el.onclick = () => openModal(i);
    el.ondragstart = () => active = c;

    // add join button
    if (c.meet) {
      const isShort = (c.end - c.start) === 1; // 1-hour class
      addJoinButton(el, c, isShort);
    }

    // append class inside its starting slot
    slot.appendChild(el);

    // hide slots covered by this class
    for (let h = c.start + 1; h < c.end; h++) {
      const covered = document.querySelector(`.slot[data-day="${c.day}"][data-hour="${h}"]`);
      if (covered) covered.classList.add("hidden");
    }

    // --- Resize handle with snapping ---
    el.addEventListener("mousedown", e => {
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.bottom - 8) return; // only bottom 8px
      e.stopPropagation();
      document.body.style.userSelect = "none";

      const startY = e.clientY;
      const startEnd = c.end;

      const onMouseMove = e => {
        const delta = e.clientY - startY;
        let newEnd = Math.round((delta + (startEnd - c.start) * slotHeight) / slotHeight) + c.start;
        newEnd = Math.max(newEnd, c.start + 1);
        newEnd = Math.min(newEnd, endHour);
        c.end = newEnd;
        save();
      };

      const onMouseUp = () => {
        document.body.style.userSelect = "auto";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });
}


function openModal(i){
  active = data[i];
  modal.style.display = "flex";
  mTitle.value = active.title;
  mTeacher.value = active.teacher;
  mRoom.value = active.room;
  mMeet.value = active.meet || "";
  mReminder.value = active.reminder || "";
}

function saveEdit(){
  Object.assign(active,{
    title:mTitle.value,
    teacher:mTeacher.value,
    room:mRoom.value,
    meet:mMeet.value,
    reminder:mReminder.value
  });
  save();
  modal.style.display = "none";
}

function save(){
  localStorage.setItem("scheduleData", JSON.stringify(data));
  render();
}

modal.onclick = e => {
  if(e.target.id === "modal") modal.style.display = "none";
};

render();
function addJoinButton(el, c, isShort){
  // create the button
  const btn = document.createElement("button");
  btn.className = "join-btn";
  btn.textContent = "Join Class";

  // click handler
  btn.onclick = e => {
    e.stopPropagation();
    window.open(c.meet, "_blank");
  };

  if(isShort){
    // style for side button
    btn.style.position = "absolute";
    btn.style.top = "8px";
    btn.style.right = "8px";
    btn.style.width = "auto";
    btn.style.padding = "4px 6px";
    btn.style.fontSize = "0.7em";
  }

  el.appendChild(btn);
}
