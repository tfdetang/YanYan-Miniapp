from FlaskApp import app
app.run(debug=True,port=443,host='0.0.0.0',ssl_context='adhoc')