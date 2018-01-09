try:
    from FlaskApp.FlaskApp import app, db
except:
    import sys

    sys.path.append('..')
    from FlaskApp import app, db

from flask import redirect, session, url_for, request, g, abort, jsonify
from flask_login import logout_user, login_user, current_user, LoginManager
from FlaskApp.weixin import WXAPPAPI
from FlaskApp.Model import *
from FlaskApp.handler import *
from FlaskApp.utils.error_code import error_code
import json
from functools import wraps


# ===========================================接口初始化==========================================

weixinapi = WXAPPAPI(appid=app.config['WEIXIN_APPID'],
                app_secret=app.config['WEIXIN_SECRET'])


lm = LoginManager()
lm.init_app(app)


@lm.request_loader
def load_user_from_request(request):
    login_key = request.args.get('login_key')
    if login_key:
        try:
            token = db.session.query(Token).filter(Token.secret == login_key).one()
            if token.check_expire():
                user = load_user_by_id(token.bind_user)
                return user
            else:
                return None
        except:
            return None
    return None


def login_required(func):
    @wraps(func)
    def decorated_view(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({'errMsg':error_code['4001'],'errCode':'4001'})
        return func(*args, **kwargs)
    return decorated_view

@app.before_request
def before_request():
    g.user = current_user
    g.db = db


# ===========================================小程序接口==========================================

# --------------------------------------------登陆验证-------------------------------------------

@app.route('/login/wechat/', methods=['GET'])
def login_wechat():
    code = request.args.get('code')
    userinfo = request.args.get('userinfo')
    session_info = weixinapi.exchange_code_for_session_key(code=code)
    openid = session_info.get('openid')
    try:
        user = load_user_by_openid(openid)
    except:
        user = new_user_register(openid, json.loads(userinfo))
    login_key = user.generate_login_key()
    return jsonify({'userid':user.id,
                    'login_key':login_key.secret})


# --------------------------------------------用户相关接口----------------------------------------

@app.route('/user/self/', methods=['GET'])
@login_required
def current_user_info():
    user = g.user
    user_info = dict(nickname=user.nickname,
                     username=user.username,
                     city=user.city,
                     province=user.province,
                     country=user.country,
                     intro=user.get_profile().intro,
                     profile_img=user.get_profile().profile_img,
                     weixin_id=user.get_profile().weixin_id,
                     user_id=user.id,
                     followers=user.followers.count(),
                     followed_users=user.followed.count(),
                     avatar="{}/avatar_{}".format(app.config['BASE_URL'], user.id))
    user_info['errMsg'] = error_code['4000']
    user_info['errCode'] = '4000'
    return jsonify(user_info)


# --------------------------------------------时间线相关接口----------------------------------------

def message_2_dict(i):
    '''
    输入一个message对象，获取其dict格式的信息
    :param i: message对象
    :return: dict对象
    '''
    user = load_user_by_id(i.author_id)
    images = []
    message = dict(id=i.id,
                   body=i.body,
                   type=i.type,
                   time_create=tools.timestamp_2_zh(i.time_create),
                   time_update=tools.timestamp_2_zh(i.time_update),
                   comment_count=str(i.comment_count),
                   quote_count=str(i.quote_count),
                   favo_count=str(i.favo_users.count()),
                   author_id=i.author_id,
                   nickname=user.nickname,
                   username=user.username,
                   is_favoed=g.user.is_favoed_message(i.id),
                   is_quoted=g.user.is_quoted_message(i.id),
                   is_comment=g.user.is_commented_message(i.id),
                   avatar = app.config['BASE_URL']+'/avatar_'+str(i.author_id))

    if i.images.count() > 0:
        for j in i.images:
            images.append(j.full_url())
    message['images'] = images
    return message


def events_2_dict(events):
    message_list = []
    if events:
        for i in events:
            if i.type == 1:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                message_list.append(message)
            elif i.type == 2 or i.type == 3:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['quoted'] = message_2_dict(i.get_message().get_quoted_message())
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                message_list.append(message)
            elif i.type == 4 or i.type == 5:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['sponsor_nickname'] = i.get_sponsor().nickname
                try:
                    message['quoted'] = message_2_dict(i.get_message().get_quoted_message())
                except:
                    pass
                message['sponsor_id'] = i.sponsor
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                message_list.append(message)
            elif i.type == 7:
                associate = i.get_associateuser()
                message = dict(sponsor_nickname=i.get_sponsor().nickname,
                               sponsor_id=i.sponsor,
                               associate_nickname=associate.nickname,
                               associate_id=associate.id)
                message['type'] = i.type
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                message_list.append(message)
    return message_list


def photo_2_dict(photos):
    photo_list = []
    if photos:
        for i in photos:
            photodict = dict(uploader=i.uploader,
                             uploade_time=tools.timestamp_2_str(i.uploade_time),
                             url=app.config['BASE_URL']+'/'+i.url,
                             relate_message=i.relate_message)
            relate_message = db.session.query(Message).filter(Message.id == i.relate_message).one()
            photodict['caption'] = relate_message.body
            photo_list.append(photodict)
    return photo_list


@app.route('/messages/<id>', methods=['GET'])
@login_required
def get_message(id):
    message = db.session.query(Message).filter(Message.id == id).one()
    message_dict = message_2_dict(message)
    if message.type != 0:
        quoted = db.session.query(Message).filter(Message.id == message.quote_id).one()
        message_dict['quoted'] = message_2_dict(quoted)
    return jsonify(message_dict)


@app.route('/events/', methods=['GET'])
@login_required
def get_events():
    limit = 10
    start = request.args.get('start', '0')
    direction = request.args.get('direction', '0')
    if start == '0':
        query = g.user.followed_event().order_by(Event.id.desc())
    else:
        if direction == '0':
            query = g.user.followed_event().filter(Event.id < int(start)).order_by(Event.id.desc())
        else:
            query = g.user.followed_event().filter(Event.id > int(start))
    events = query.limit(limit).all()
    message_list = events_2_dict(events)
    result = dict(num=len(message_list),
                  message_list=message_list)
    return jsonify(result)

# ---------------------------------------推文操作相关接口-----------------------------


@app.route('/message/favo_message/', methods=['GET','POST'])
@login_required
def favo_message():
    message_id = request.args.get('message_id', '0')
    try:
        message = db.session.query(Message).filter(Message.id == message_id).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    if g.user.is_favoed_message(message_id):
        g.user.unfavo_message(message_id)
        favo = 0
    else:
        g.user.favo_message(message_id)
        favo = 1
    favo_count = message.favo_users.count()
    return jsonify({'favo':favo,'count':str(favo_count)})


@app.route('/message/reply_message_<id>/', methods=['GET','POST'])
@login_required
def reply_message(id):
    comment = request.args.get('comment', ' ')
    try:
        message = db.session.query(Message).filter(Message.id == int(id)).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    g.user.comment_message(comment, int(id))
    return jsonify({'status': 'success'})
