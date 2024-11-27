# auth/forms.py

from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField
from wtforms.validators import DataRequired, EqualTo

class SetupForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(), EqualTo('password', message='Passwords must match')])
    passphrase = PasswordField('Encryption Key', validators=[DataRequired()], description="Remember this key to encrypt/decrypt your files.")
    confirm_passphrase = PasswordField('Confirm Encryption Key', validators=[
        DataRequired(), EqualTo('passphrase', message='Encryption keys must match')])

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    passphrase = PasswordField('Encryption Key', validators=[DataRequired()])
