# 🎯 Aim Game - Premium Browser FPS

A lightweight, 3D browser-based First-Person Shooter (FPS) and aim trainer built for performance and simplicity.
This project uses **Three.js** for rendering immersive 3D environments and a minimal **Flask** backend to serve the application.

---

## 🚀 Features

* 🎮 **First-Person Controls**
  Smooth mouse look using Pointer Lock API with responsive WASD movement.

* 🌐 **3D Environment**
  Procedurally generated targets in an interactive 3D space.

* 🔫 **Shooting Mechanics**
  Accurate hit detection using raycasting.

* 📊 **Score Tracking**
  Real-time UI updates when targets are destroyed.

---

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Three.js
* **Backend:** Python, Flask

---

## 📁 Project Structure

```
AIM-GAME/
├── templates/
│   └── index.html       # Three.js game logic and UI
├── app.py               # Flask server configuration
├── requirements.txt     # Python dependencies
└── README.md            # Project documentation
```

---

## ⚙️ Prerequisites

* Python 3.x installed on your system

---

## 🧩 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/lakshaywalia666/simple-aim-game.git
cd aim-game
```

### 2. Create & Activate Virtual Environment (Recommended)

**Windows**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux**

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

Ensure `requirements.txt` includes `Flask`, then run:

```bash
pip install -r requirements.txt
```

### 4. Run the Application

```bash
python app.py
```

### 5. Play the Game

Open your browser and go to:

```
http://localhost:5000
```

or

```
http://127.0.0.1:5000
```

---

## 🎮 Controls

| Action       | Key/Input    |
| ------------ | ------------ |
| Start Game   | Click Screen |
| Move         | W, A, S, D   |
| Look Around  | Mouse        |
| Shoot        | Left Click   |
| Pause/Unlock | ESC          |

---

## 📌 Future Improvements

* 🎯 Multiple difficulty levels
* 🧠 AI moving targets
* 📈 Performance tracking & analytics
* 🌍 Multiplayer support

---

## 📄 License

This project is open-source and available under the **MIT License**.

---

## 💡 Author

**Lakshay Walia**
Feel free to contribute, fork, or raise issues!

---

⭐ If you like this project, consider giving it a star on GitHub!
