from werkzeug.security import check_password_hash

def check_password(password, hashed):
    """
    Verify a password against the given hashed value using Werkzeug's check_password_hash.
    
    :param password: The plaintext password to verify.
    :param hashed: The hashed password from the database.
    :return: Boolean indicating if the password matches the hash.
    """
    return check_password_hash(hashed, password)
