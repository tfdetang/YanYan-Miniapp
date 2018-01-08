try:
    from FlaskApp.FlaskApp import app, db
except:
    import sys

    sys.path.append('..')
    from FlaskApp import app, db

from flask import jsonify
from concurrent.futures import ThreadPoolExecutor
from FlaskApp.Model import *
from FlaskApp.utils import tools

executor = ThreadPoolExecutor(20)


# -----------------------------------------用户相关处理-------------------------------------

def generate_user_name(nickname):
    return nickname  # todo: 根据nickname生成username


def load_user_by_id(userid):
    return db.session.query(User).filter(User.id == userid).one()


def load_user_by_openid(openid):
    return db.session.query(User).filter(User.openid == openid).one()


def new_user_register(openid, userinfo):
    nickname = userinfo.get('nickName')
    username = generate_user_name(nickname)
    sex = userinfo.get('gender')
    city = userinfo.get('city')
    province = userinfo.get('province')
    country = userinfo.get('country')
    subscribe_time = tools.generate_timestamp()
    new_user = User(openid=openid,
                    nickname=nickname,
                    username=username,
                    sex=sex,
                    city=city,
                    province=province,
                    country=country,
                    subscribe_time=subscribe_time,
                    subscribe_status=1)
    new_user.save()
    new_user.set_profile()
    new_user.follow(new_user.id)
    executor.submit(tools.save_img(userinfo.get('avatarUrl'), 'avatar_{}'.format(new_user.id)))
    return new_user
