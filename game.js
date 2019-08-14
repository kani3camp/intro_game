var audioElem = new Audio();    // 音源再生用
audioElem.volume = 0.1;     // 初期値０
var current_num;            // 現在再生中の曲の配列番号
var correct_btn;            // 正解のボタン（1-4のどれか）
var numSongs = song_files.length;   // 全曲数
var _canStart = false;          // スタートしていいか。フラグ
var _nowPlaying = false;        // 再生中フラグ
var _nowSelected = true;        // 選択中フラグ
var time_start, time_end;       // 音源の再生開始位置および回答時の再生位置
var numCorrect1 = 0, numIncorrect1 = 0, sumCorrectTime1 = 0;  // プレイヤー１（host）の累計正解数、不正解数、正解時の合計考慮時間
var numCorrect2 = 0, numIncorrect2 = 0, sumCorrectTime2 = 0;  // プレイヤー２（client）の累計正解数、不正解数、正解時の合計考慮時間
var playSide;       // hostか、clientか、watcherか
var roundNum;       // 現在、何回戦か
const db = firebase.database();   // firebaseのデータベース
var is_started, is_challenger;    // ゲームが開始されているか、挑戦者が待っているか
var is_answered1, is_answered2;   // プレイヤー１が回答済か、プレイヤー２が回答済か
var btn1_num, btn2_num, btn3_num, btn4_num;   // 選択ボタン要素
var time1, time2;       // プレイヤー１のタイム、プレイヤー２のタイム
var is_correct1, is_correct2;       // プレイヤー１の合否、プレイヤー２の合否
var startBtn, createBtn, enterBtn, enforceStopBtn;    // 各ボタン要素
var imWaiting = false;      // 自分が待っている人か。フラグ
var _isPlaying = false;     // 曲を再生中か。フラグ
const HOST = 'host';        
const CLIENT = 'client';    
const WATCHER = 'watcher';  


// ページ読込時の処理
window.onload = function(){
  roundBox = document.getElementById('round');
  btn1 = document.getElementById('btn1');
  btn2 = document.getElementById('btn2');
  btn3 = document.getElementById('btn3');
  btn4 = document.getElementById('btn4');
  challengerBox = document.getElementById('challenger');
  createBtn = document.getElementById('create');
  startBtn = document.getElementById('start');
  enterBtn = document.getElementById('enter');
  enforceStopBtn = document.getElementById('enforceStop');
  messageBox = document.getElementById('message');
  timeBox = document.getElementById('time');
  opponentInfoBox = document.getElementById('opponent-info');
}

// firebaseのリアルタイムデータベースの'is-started'というデータが変更された時に自発的に実行する（以下同）
db.ref('is-started').on('value', function(snapshot) {
  is_started = snapshot.val();
  if (is_started) {
    if (imWaiting == false && playSide != CLIENT) {
      watchGame();
    }
  }
});
db.ref('is-challenger').on('value', function(snapshot) {
  is_challenger = snapshot.val();
  if (!imWaiting)
    checkRoom();
});


// すでに人が待ってるか？
// 待っていれば、それに「参加」ボタンを表示。いなければ、「待つ」ボタンを表示。すでに対戦中なら、観戦
function checkRoom() {
  if(is_started){
    createBtn.style.display = 'none';
    enterBtn.style.display = 'none';
    watchGame();
  } else if(is_challenger){
    createBtn.style.display = 'none';
    challengerBox.innerText = '現在　挑戦者　あり'; 
    enterBtn.style.display = 'inline-block';
  } else {
    challengerBox.innerText = '現在　挑戦者　なし'; 
    createBtn.style.display = 'inline-block';
  }
}


// 部屋を作成して、待つ
function createRoom() {
  if (is_started) {
    watchGame();
  } else if (is_challenger) {
    joinRoom();
  } else {
    console.log('create room');
    imWaiting = true;
    db.ref('is-challenger').set(true);
    recordLastAccess();
    challengerBox.innerText = '現在　相手の登場　待ち';
    createBtn.style.display = 'none';
    hostSelectSong();
    db.ref('is-started').on('value', function(snapshot) {
      if (snapshot.val()) {
        challengerBox.innerText = '相手がきました';
        console.log('an opponent appeared!');
        imWaiting = false;
        playSide = HOST;
        challengerBox.innerText = 'あなたは プレイヤー１';
        enterBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';
        _canStart = true;
        startBtn.style.visibility = 'visible';
        roundNum = 1;
        db.ref('round-num').set(roundNum);
        recordLastAccess();
      }
    });
  }
}

// 部屋に参加して、対戦開始
function joinRoom() {
  if (is_started) {
    enterBtn.style.display = 'none';
    watchGame();
  } else {
    console.log('join room');
    playSide = CLIENT;
    db.ref('is-started').set(true);
    recordLastAccess();
    challengerBox.innerText = 'あなたは プレイヤー２';
    enterBtn.style.display = 'none';
    startBtn.style.display = 'inline-block';
    _canStart = true;
    startBtn.style.visibility = 'visible';
  }
}

// 観戦する画面を表示する
function watchGame() {
  console.log('watch game');
  playSide = WATCHER;
  challengerBox.innerText = '観戦中';
  createBtn.style.display = 'none';
  enterBtn.style.display = 'none';
  enforceStopBtn.style.display = 'inline-block';
  startPlaying();
  refreshShow();
  showOptions();
}


// データベースに最終更新時間を記録
function recordLastAccess() {
  if(playSide == HOST) {
    db.ref('last-access1').set(Date.now());
  } else if(playSide == CLIENT) {
    db.ref('last-access2').set(Date.now());
  }
}



/*// ユーザー名を入力する
function disp(){
	// 入力ダイアログを表示 ＋ 入力内容を user に代入
	user = window.prompt("ユーザー名を入力してください", "");
	// 入力内容が tama の場合は example_tama.html にジャンプ
	if(user == 'tama'){
		location.href = "example_tama.html";
	}
	// 入力内容が hana の場合は example_hana.html にジャンプ
	else if(user == 'hana'){
		location.href = "example_hana.html";
	}
	// 入力内容が一致しない場合は警告ダイアログを表示
	else if(user != "" && user != null){
		window.alert(user + 'さんは登録されていません');
	}
	// 空の場合やキャンセルした場合は警告ダイアログを表示
	else{
		window.alert('キャンセルされました');
	}
}
*/

// ４つの回答ボタンに選択肢となる曲名を表示
function writeText(i, str){
  switch(i){
    case 1: btn1.innerText = str; break;
    case 2: btn2.innerText = str; break;
    case 3: btn3.innerText = str; break;
    case 4: btn4.innerText = str; break;
  }
}


db.ref('is-answered1').on('value', function(snapshot) {
  is_answered1 = snapshot.val();
  if (is_answered1 && is_answered2)
    nextRound();    
});
db.ref('is-answered2').on('value', function(snapshot) {
  is_answered2 = snapshot.val();
  if (is_answered1 && is_answered2)
    nextRound();
});
function nextRound(){   
  if (roundNum % 10 == 0)
    showAlert();
  if (playSide == HOST){
    // 曲を決定し、dbに登録
    hostSelectSong();
    db.ref('round-num').set(roundNum+1);
    db.ref('is-answered1').set(false);
  } else if (playSide == CLIENT) {
    db.ref('is-answered2').set(false);
  } else if (playSide == WATCHER) {
  }
  if (playSide != WATCHER) {
    recordLastAccess();
    _canStart = true;
    startBtn.style.visibility = 'visible';
  }
}
db.ref('round-num').on('value', function(snapshot) {
  roundNum = snapshot.val();
  if (roundNum > 0) {
    roundBox.innerText = 'ラウンド' + String(roundNum);
  } else {
    roundBox.innerText = '　';
  }
});

// これまでの結果を表示
function showAlert(){
  if (playSide == HOST) {
    alert('あなたの正解数：' + numCorrect1 + '回、不正解数：' + numIncorrect1 + '回\n正解時の平均タイム：' 
    + ((numCorrect1 != 0) ? (sumCorrectTime1/numCorrect1).toFixed(3) : '--') + '秒\n'
    + '相手の正解数：' + numCorrect2 + '回、不正解数：' + numIncorrect2 + '回\n正解時の平均タイム：' 
    + ((numCorrect2 != 0) ? (sumCorrectTime2/numCorrect2).toFixed(3) : '--') + '秒');
  } else if (playSide == CLIENT) {
    alert('あなたの正解数：' + numCorrect2 + '回、不正解数：' + numIncorrect2 + '回\n正解時の平均タイム：' 
    + ((numCorrect2 != 0) ? (sumCorrectTime2/numCorrect2).toFixed(3) : '--') + '秒\n'
    + '相手の正解数：' + numCorrect1 + '回、不正解数：' + numIncorrect1 + '回\n正解時の平均タイム：' 
    + ((numCorrect1 != 0) ? (sumCorrectTime1/numCorrect1).toFixed(3) : '--') + '秒');
  } else {
  }
}

function onStartClicked(){
  if(_canStart == true && playSide != WATCHER){
    _canStart = false;
    opponentInfoBox.innerText = '';
    if (is_answered2 && playSide == HOST) {
      showOpponentResult(2);
    } else if (is_answered1 && playSide == CLIENT) {
      showOpponentResult(1);
    }
    startBtn.style.visibility = 'hidden';
    if(_nowPlaying) 
      stopPlaying();
    _nowPlaying = true;
    _nowSelected = false;
    document.getElementById('message').innerText = '';
    console.log('play ', song_titles[current_num])
    showOptions();
    startPlaying();
    refreshShow();
  }
}

function onSelected(selected_btn){
  if (playSide == WATCHER) {
    if (selected_btn == correct_btn) {
      checkBoxColor(true);
    } else {
      checkBoxColor(false);
    }  
  } else if((!_nowSelected) && (_isPlaying)){
    time_end = audioElem.currentTime;
    _nowSelected = true;
    judge(selected_btn);
    if (playSide == HOST) {
      db.ref('is-answered1').set(true);
    } else if(playSide == CLIENT) {
      db.ref('is-answered2').set(true);
    }
    recordLastAccess();
  }
}


function startPlaying(){
  console.log('song_files[', current_num, ']');
  audioElem.src = song_files[current_num];
  audioElem.load();
}
audioElem.addEventListener('loadedmetadata',function(e) {
  audioElem.play();   
  time_start = audioElem.currentTime;
  _isPlaying = true;
});

function stopPlaying() {
  audioElem.pause();
  _isPlaying = false;
}

// ランダムに楽曲、選択肢を決定
function hostSelectSong() {
  current_num = getRandom(0, numSongs-1);
  db.ref('current-num').set(current_num);
  recordLastAccess();
  correct_btn = getRandom(1, 4);
  var alreadyUsedNum = [current_num];
  for(var i=1; i<=4; i++){
    if(i == correct_btn){
      setBtnNum(i, current_num);
    } else {
      randomNum = getRandom(0, numSongs-1);
      while(alreadyUsedNum.indexOf(randomNum) >= 0){ 
        randomNum = getRandom(0, numSongs-1);
      }
      setBtnNum(i, randomNum);
      alreadyUsedNum.push(randomNum);
    }
  }
}
function setBtnNum(_i, _randomNum) {
  switch(_i){
    case 1: db.ref('btn1-num').set(_randomNum); break;
    case 2: db.ref('btn2-num').set(_randomNum); break;
    case 3: db.ref('btn3-num').set(_randomNum); break;
    case 4: db.ref('btn4-num').set(_randomNum); break;
  }
}

db.ref('current-num').on('value', function(snapshot) {
  current_num = snapshot.val();
  console.log('current-num =', current_num);
});
db.ref('btn1-num').on('value', function(snapshot) {
  btn1_num = snapshot.val();
  if (btn1_num == current_num)
    correct_btn = 1;
});
db.ref('btn2-num').on('value', function(snapshot) {
  btn2_num = snapshot.val();
  if (btn2_num == current_num)
    correct_btn = 2;
});
db.ref('btn3-num').on('value', function(snapshot) {
  btn3_num = snapshot.val();
  if (btn3_num == current_num)
    correct_btn = 3;
});
db.ref('btn4-num').on('value', function(snapshot) {
  btn4_num = snapshot.val();
  if (btn4_num == current_num)
    correct_btn = 4;
  
  if (playSide == WATCHER) {
    console.log('next round');
    stopPlaying();
    audioElem = new Audio();
    startPlaying();
    refreshShow();
    showOptions();
  }
});
function showOptions() {
  writeText(1, song_titles[btn1_num]);
  writeText(2, song_titles[btn2_num]);
  writeText(3, song_titles[btn3_num]);
  writeText(4, song_titles[btn4_num]);
}

function judge(selected_btn) {
  time = time_end - time_start;
  timeBox.innerText = String(time.toFixed(3)) + '秒';
  if (playSide == HOST) {
    db.ref('time1').set(time);
  } else if (playSide == CLIENT) {
    db.ref('time2').set(time);
  }
  recordLastAccess();
  if (selected_btn == correct_btn) {
    correct(time);
  } else {
    incorrect();
  }
}

function correct(time) {
  messageBox.innerText = '正解！';
  checkBoxColor(true);
  if (playSide == HOST) {
    numCorrect1++;
    sumCorrectTime1 += time;
    db.ref('is-correct1').set(true);
    db.ref('last-answered1').set(Date.now());
  } else if (playSide == CLIENT) {
    numCorrect2++;
    sumCorrectTime2 += time;
    db.ref('is-correct2').set(true);
    db.ref('last-answered2').set(Date.now());
  }
  recordLastAccess();
}

function incorrect() {
  messageBox.innerText = '残念！';
  checkBoxColor(false);
  if (playSide == HOST) {
    numIncorrect1++;
    db.ref('is-correct1').set(false);
    db.ref('last-answered1').set(Date.now());
  } else if (playSide == CLIENT) {
    numIncorrect2++;
    db.ref('is-correct2').set(false);
    db.ref('last-answered2').set(Date.now());
  }
  recordLastAccess();
}

db.ref('time1').on('value', function(snapshot) {
  time1 = snapshot.val();
});
db.ref('time2').on('value', function(snapshot) {
  time2 = snapshot.val();
});
db.ref('is-correct1').on('value', function(snapshot) {
  is_correct1 = snapshot.val();
});
db.ref('is-correct2').on('value', function(snapshot) {
  is_correct2 = snapshot.val();
});

db.ref('last-answered1').on('value', function(snapshot) {
  if (!_canStart)
    showOpponentResult(1);
  if (playSide == CLIENT || playSide == WATCHER) {
    if (is_correct1) {
      numCorrect1++;
      sumCorrectTime1 += time1;
    } else {
      numIncorrect1++;
    }
  }
});
db.ref('last-answered2').on('value', function(snapshot) {
  if (!_canStart)
    showOpponentResult(2);
  if (playSide == HOST || playSide == WATCHER) {
    if (is_correct2) {
      numCorrect2++;
      sumCorrectTime2 += time2;
    } else {
      numIncorrect2++;
    }  
  }
});
function showOpponentResult(n) {
  if (n == 1 && playSide == CLIENT) {
    console.log('opponent answered');
    opponentInfoBox.innerText = '相手は ' + ((is_correct1 == true) ? '正解' : '不正解')  + ' \n'
    + '相手のタイムは ' + String(time1.toFixed(3)) + ' 秒';
  } else if (n == 2 && playSide == HOST) {
    console.log('opponent answered');
    opponentInfoBox.innerText = '相手は ' + ((is_correct2 == true) ? '正解' : '不正解')  + ' \n'
    + '相手のタイムは ' + String(time2.toFixed(3)) + ' 秒';
  } else if (playSide == WATCHER) {
    console.log('player', n, 'answered');
    if (n == 1) {
      messageBox.innerText = 'プレイヤー１は' + ((is_correct1 == true) ? '正解' : '不正解')  + ' \n';
      timeBox.innerText = 'タイムは ' + String(time1.toFixed(3)) + ' 秒';
    } else if(n == 2) {
      opponentInfoBox.innerText = 'プレイヤー２は ' + ((is_correct2 == true) ? '正解' : '不正解')  + ' \n'
      + 'タイムは ' + String(time2.toFixed(3)) + ' 秒';  
    }
  }
}


function checkBoxColor(_isCorrect) {
  if(_isCorrect) {
    switch(correct_btn) {
      case 1 : btn1.style.backgroundColor = 'lightgreen';  btn1.style.color = 'white'; break;
      case 2 : btn2.style.backgroundColor = 'lightgreen';  btn2.style.color = 'white'; break;
      case 3 : btn3.style.backgroundColor = 'lightgreen';  btn3.style.color = 'white'; break;
      case 4 : btn4.style.backgroundColor = 'lightgreen';  btn4.style.color = 'white'; break;
    }
  } else {
    switch(correct_btn) {
      case 1 : btn1.style.backgroundColor = 'red';  btn1.style.color = 'white'; break;
      case 2 : btn2.style.backgroundColor = 'red';  btn2.style.color = 'white'; break;
      case 3 : btn3.style.backgroundColor = 'red';  btn3.style.color = 'white'; break;
      case 4 : btn4.style.backgroundColor = 'red';  btn4.style.color = 'white'; break;
    }
  }
}

function refreshShow() {
  btn1.style.backgroundColor = 'white';  btn1.style.color = '#67c5ff';
  btn2.style.backgroundColor = 'white';  btn2.style.color = '#67c5ff';
  btn3.style.backgroundColor = 'white';  btn3.style.color = '#67c5ff';
  btn4.style.backgroundColor = 'white';  btn4.style.color = '#67c5ff';
  messageBox.innerText = '';
  timeBox.innerText = '';
}

function getRandom(min, max) {
  return Math.floor(Math.random()*(max - min + 1) + min);
}

document.addEventListener('keydown', (event) => {
  var keyName = event.key;
  switch(keyName) {
    case 'f' : onSelected(1); break;
    case 'v' : onSelected(3); break;
    case 'n' : onSelected(4); break;
    case 'j' : onSelected(2); break;
    default : onStartClicked();
  }
  // console.log('keydown:${keyName}');
});


// 強制終了
function enforceStop() {
  db.ref('is-started').set(false);
  db.ref('is-challenger').set(false);
  db.ref('is-answered1').set(false);
  db.ref('is-answered2').set(false);
  db.ref('round-num').set(0);
  db.ref('current-num').set(-1);
  db.ref('enforced-stop').set(Date.now());
  location.reload(true);
}
var last_access = 0;
var _canRelord = false;
db.ref('enforced-stop').on('value', function(snapshot) {
  if (last_access < snapshot.val())
    last_access = snapshot.val();
  
  if (!_canRelord) {
    _canRelord = true;  // 初回の読み込みはスルー
  } else {
    location.reload(true);
  }
});

db.ref('last-access1').on('value', function(snapshot) {
  if (last_access < snapshot.val())
    last_access = snapshot.val();
});
db.ref('last-access2').on('value', function(snapshot) {
  if (last_access < snapshot.val())
    last_access = snapshot.val();
});
setInterval(function() {
  if ((Date.now() - last_access) > 30*60*1000) {  // 30分放置されていたら
    enforceStop();
  }
}, 10*60*1000); // 10分ごと


function changeVolume(value) {
  audioElem.volume = value;
}

window.addEventListener('beforeunload', function(){
  /** 更新される直前の処理 */
  if (imWaiting) {
    db.ref('is-challenger').set(false);
  } else if (playSide == HOST || playSide == CLIENT) {
    enforceStop();
  }
});