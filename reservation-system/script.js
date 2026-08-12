// ここをあなたの GAS の URL に書き換える
const API_URL = "https://script.google.com/macros/s/AKfycbyaIbzsNSW2M2qrSf23ca-OeDzG6nzO36mG2j1aZPnjh6fm95-zY_bXb6INMo07AdMo2g/exec";
// 画面が開かれたときに、自動で進行中リストを読み込む
// 画面が開かれたときに、自動で適切な初期処理を行う
// 画面が開かれた瞬間に動く処理
window.addEventListener("DOMContentLoaded", () => {
  // 運営画面（admin.html）を開いた場合
  if (document.getElementById("progress-container")) {
    loadProgressLists();
  }
  
  // お客様画面（index.html）を開いた場合
  if (document.getElementById("customer-done-list")) {
    loadCustomerLists(); // 💡 開いた瞬間に即座に1回読み込む！
    setInterval(loadCustomerLists, 30000); // その後は30秒ごとに自動更新
  }
});

//
// 運営側：状態を更新する関数（超高速・連打防止版）
//
function updateStatus(status) {
  const id = document.getElementById("num").value;
  if (!id) {
    alert("番号を入力してください");
    return;
  }

  // 1. 連打防止のためにボタンを無効化
  const buttons = document.querySelectorAll("button");
  buttons.forEach(btn => btn.disabled = true);

  // 【超高速化】Googleの返事を待たずに、今押した番号を即座に画面のリストに移動させる
  const makingList = document.getElementById("making-list");
  const doneList = document.getElementById("done-list");
  
  // 既存のリストから、今から更新するIDの古い表示を一度消す
  document.querySelectorAll("#progress-container li").forEach(li => {
    if (li.innerText === `番号 【${id}】`) li.remove();
  });

  // 新しいリストへ即座に追加
  const newLi = document.createElement("li");
  newLi.innerText = `番号 【${id}】`;
  
  if (status === "making") {
    makingList.appendChild(newLi);
  } else if (status === "done") {
    doneList.appendChild(newLi);
  }

  // 入力欄をクリアして、次の番号をすぐ打てるようにする
  document.getElementById("num").value = "";

  // 2. 裏側で静かにGoogle Apps Scriptへデータを送る
  const form = new URLSearchParams();
  form.append("id", id);
  form.append("status", status);

  fetch(API_URL, {
    method: "POST",
    body: form
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      alert(`エラーが発生しました: ${data.error}`);
      loadProgressLists();
    }
  })
  .catch(error => {
    console.error("通信エラー:", error);
    alert("通信に失敗しました。");
    loadProgressLists();
  })
  .finally(() => {
    // 通信が終わったらボタンをすぐ使えるように戻す
    buttons.forEach(btn => btn.disabled = false);
  });
}

//
// 運営側：現在進行中の番号リストを読み込んで表示する関数
//
function loadProgressLists() {
  fetch(`${API_URL}?all=true`)
    .then(res => res.json())
    .then(data => {
      const makingList = document.getElementById("making-list");
      const doneList = document.getElementById("done-list");
      
      makingList.innerHTML = "";
      doneList.innerHTML = "";

      if (data.error || !Array.isArray(data)) return;

      data.forEach(item => {
        const li = document.createElement("li");
        li.innerText = `番号 【${item.id}】`;

        if (item.status === "making") {
          makingList.appendChild(li);
        } else if (item.status === "done") {
          doneList.appendChild(li);
        }
      });
    })
    .catch(err => console.error("リスト読み込みエラー:", err));
}

//
// お客様側：現在進行中の番号リストを読み込んで表示する関数（決定版）
//
function loadCustomerLists() {
  fetch(`${API_URL}?all=true`)
    .then(res => {
      if (!res.ok) throw new Error("ネットワークエラー");
      return res.json();
    })
    .then(data => {
      if (data.error || !Array.isArray(data)) {
        console.error("GASからのエラー:", data.error);
        return;
      }

      const doneList = document.getElementById("customer-done-list");
      const makingList = document.getElementById("customer-making-list");
      
      doneList.innerHTML = "";
      makingList.innerHTML = "";

      data.forEach(item => {
        if (!item || !item.id) return;

        const li = document.createElement("li");
        li.innerText = item.id;

        if (item.status === "done") {
          li.style.border = "2px solid #00cc66";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "white";
          doneList.appendChild(li);
        } else if (item.status === "making") {
          // 💡 製作中の番号をオレンジの枠で囲み、背景を薄いオレンジにします
          li.style.border = "2px solid #ff9900";
          li.style.borderRadius = "5px";
          li.style.padding = "5px 15px";
          li.style.backgroundColor = "#fff9f0"; 
          makingList.appendChild(li);
        }
      });
    })
    .catch(err => console.error("お客様リスト読み込みエラー:", err));
}