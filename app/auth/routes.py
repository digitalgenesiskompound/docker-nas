from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required, current_user
from datetime import timedelta

from .forms import SetupForm, LoginForm, ChangePasswordForm
from .models import user_exists, create_user, get_user, update_password
from .utils import check_password

auth_bp = Blueprint('auth', __name__)

from flask_login import UserMixin

class User(UserMixin):
    def __init__(self, username):
        self.id = username

from extensions import login_manager

@login_manager.user_loader
def load_user(user_id):
    user = get_user()
    if user and user['username'] == user_id:
        return User(user['username'])
    return None

from flask import current_app

@auth_bp.before_app_request
def require_login():
    allowed_routes = {'auth.login', 'auth.setup', 'static'}
    if user_exists():
        if request.endpoint == 'auth.setup':
            return redirect(url_for('auth.login'))
    if request.endpoint not in allowed_routes and not current_user.is_authenticated:
        return redirect(url_for('auth.login'))

@auth_bp.after_app_request
def add_header(response):
    if request.endpoint in ['auth.login', 'auth.change_password', 'auth.setup']:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@auth_bp.route('/setup', methods=['GET', 'POST'])
def setup():
    if user_exists():
        current_app.logger.info("Setup attempted after user exists. Redirecting to login.")
        return redirect(url_for('auth.login'))
    
    form = SetupForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        create_user(username, password)
        current_app.logger.info(f"User '{username}' created during setup.")
        flash('Setup complete. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('setup.html', form=form)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if not user_exists():
        current_app.logger.info("No user exists. Redirecting to setup.")
        return redirect(url_for('auth.setup'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = get_user()
        if (user and 
            form.username.data == user['username'] and 
            check_password(form.password.data, user['password'])):
            user_obj = User(user['username'])
            remember = form.remember.data
            login_user(user_obj, remember=remember, duration=timedelta(days=current_app.config['REMEMBER_COOKIE_DURATION']))
            current_app.logger.info(f"User '{user['username']}' logged in successfully.")
            flash('Logged in successfully.', 'success')
            return redirect(url_for('main.index'))
        else:
            current_app.logger.warning(f"Failed login attempt for username: {form.username.data}")
            flash('Invalid username or password.', 'danger')
    
    return render_template('login.html', form=form)

@auth_bp.route('/change_password', methods=['GET', 'POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    if form.validate_on_submit():
        user = get_user()
        if user and check_password(form.current_password.data, user['password']):
            success = update_password(form.new_password.data)
            if success:
                current_app.logger.info(f"User '{user['username']}' changed password successfully.")
                flash('Your password has been updated successfully.', 'success')
                return redirect(url_for('main.index'))
            else:
                current_app.logger.error(f"Failed to update password for user '{user['username']}'.")
                flash('An error occurred while updating your password.', 'danger')
        else:
            current_app.logger.warning(f"Incorrect current password attempt by user '{current_user.id}'.")
            flash('Current password is incorrect.', 'danger')
    return render_template('change_password.html', form=form)

@auth_bp.route('/logout')
@login_required
def logout():
    username = current_user.id
    logout_user()
    current_app.logger.info(f"User '{username}' logged out successfully.")
    flash('Logged out successfully.', 'success')
    return redirect(url_for('auth.login'))
