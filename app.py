from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    # Running on 0.0.0.0 makes the server accessible to other devices on your network
    # Port 5000 is the default Flask port
    app.run(host='0.0.0.0', port=5000, debug=True)