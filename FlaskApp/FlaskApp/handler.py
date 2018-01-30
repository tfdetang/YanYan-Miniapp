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
import random

executor = ThreadPoolExecutor(20)


# -----------------------------------------用户相关处理-------------------------------------

def generate_user_name(nickname):
    username = tools.username_requlier(nickname)
    exist = (db.session.query(User).filter(User.username == username).count() > 0)
    if exist:
        username = username + '_' + str(random.randint(1,11))
    return username


def load_user_by_id(userid):
    return db.session.query(User).filter(User.id == userid).one()


def load_user_by_openid(openid):
    return db.session.query(User).filter(User.openid == openid).one()


def _handle_channel(find_channel, body):
    channel_list = []
    for i in find_channel:
        if i[-1] == '#':
            channel_list.append(i)
        else:
            channel_list.append(i[:-1])
    channel_list = list(set(channel_list))
    channel_list.sort(key=lambda x: len(x), reverse=True)
    channel_dict = {}
    for i in channel_list:
        channel_dict[i] = tools.generate_token('5')
        body = body.replace(i, channel_dict[i])
    for i in channel_dict.keys():
        href = '#' + i.replace('#', '')
        a_tag = '<a class="link" href="{}">{}</a>'.format(href, i)
        body = body.replace(channel_dict[i], a_tag)
    return body


def _handle_user(find_user, body):
    user_list = []
    for i in find_user:
        user_list.append(i[:-1])
    user_list = list(set(user_list))
    user_list.sort(key=lambda x: len(x), reverse=True)
    user_dict = {}
    for i in user_list:
        user_dict[i] = tools.generate_token('5')
        body = body.replace(i, user_dict[i])
    for i in user_dict.keys():
        username = i.replace('@', '')
        try:
            user = db.session.query(User).filter(User.username == username).one()
            href = '@' + str(user.id)
            a_tag = '<a class="link" href="{}">{}</a>'.format(href, i)
        except:
            a_tag = i
        body = body.replace(user_dict[i], a_tag)
    return body


def constract_message(body):
    body = body + ' '
    find_channel = tools.match_channel(body)
    find_user = tools.match_person(body)
    body = _handle_channel(find_channel, body)
    body = _handle_user(find_user, body)
    return body


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
                    district="",
                    country=country,
                    subscribe_time=subscribe_time,
                    subscribe_status=1)
    new_user.save()
    new_user.set_profile()
    new_user.followed.append(new_user)
    new_user.add_role()
    new_user.save()
    executor.submit(tools.save_img(userinfo.get('avatarUrl'), 'avatar_{}'.format(new_user.id)))
    return new_user

if __name__ == '__main__':
    print(constract_message('@weikunt 我来试试#频道测试#测试以及多个#频道，对了还有#频道 @唐大毛 看看行不行'))