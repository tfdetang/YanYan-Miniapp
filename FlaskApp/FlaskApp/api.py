try:
    from FlaskApp.FlaskApp import app, db
except:
    import sys

    sys.path.append('..')
    from FlaskApp import app, db

from flask import redirect, session, url_for, request, g, abort, jsonify
from sqlalchemy import func
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
    if not login_key:
        login_key = request.form.get('login_key')
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
            return jsonify({'errMsg': error_code['4001'], 'errCode': '4001'})
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
    return jsonify({'userid': user.id,
                    'login_key': login_key.secret})


# --------------------------------------------用户相关接口----------------------------------------

def user_2_dict(user, simple=False):
    user_info = dict(nickname=user.nickname,
                     username=user.username,
                     user_id=user.id,
                     intro = user.get_profile().intro,
                     followers=user.followers.count(),
                     followed_users=user.followed.count(),
                     avatar="{}avatar_{}".format(app.config['BASE_URL'], user.id))
    if not simple:
        user_info['city'] = user.city
        user_info['province'] = user.province
        user_info['district'] = user.district
        user_info['country'] = user.country
        user_info['profile_img'] = "{}{}".format(app.config['BASE_URL'], user.get_profile().profile_img)
        user_info['weixin_id'] = user.get_profile().weixin_id
    user_info['errMsg'] = error_code['4000']
    user_info['errCode'] = '4000'
    return user_info


def notify_2_dict(notifies):
    notify_type = {'2': '转发并评论到',
                   '3': '评论到',
                   '4': '转发了推文',
                   '5': '喜欢了推文',
                   '7': '关注了你',
                   '8': '对你取消了关注',
                   '9': '提及了你',
                   '10': '取消了喜欢'}
    notify_list = []
    for i in notifies:
        event = i.notified_event
        sponsor = event.get_sponsor()
        notify_dict = dict(nickname=sponsor.nickname,
                           user_id=sponsor.id,
                           time=tools.timestamp_2_zh(event.time),
                           avatar="{}avatar_{}".format(app.config['BASE_URL'], sponsor.id),
                           operation=notify_type[str(event.type)],
                           type=event.type,
                           read=i.read,
                           id=i.id)
        if (event.type != 7) and (event.type != 8):
            message = event.get_message()
            notify_dict['body'] = message.body,
            notify_dict['message_id'] = message.id,
        notify_list.append(notify_dict)
    return notify_list


def chat_2_dict(events):
    chats = []
    for i in events:
        message = i.get_message()
        chat_dict = dict(sponsor=i.sponsor,
                         associate=i.associate_user,
                         time=tools.timestamp_2_zh(i.time),
                         body=message.body,
                         message_id=message.id,
                         event_id=i.id)
        chats.append(chat_dict)
        if i.associate_user == g.user.id:
            i.notifies[0].read = 1
    db.session.commit()
    return chats


# ------------------------------用户信息-----------------------------------

@app.route('/user/', methods=['GET'])
def user_list():
    limit = 6
    method = request.args.get('method', 'active')
    range = request.args.get('range', '500')
    count = db.session.query(Message).count()
    start = count - int(range)
    if start < 0:
        start = 0
    query = db.session.query(Message.author_id, func.count(Message.author_id)).filter(
        (Message.type != 4) & (Message.id > start)).group_by(
        Message.author_id).order_by(
        func.count(Message.author_id).desc())
    authors = query.limit(limit).all()
    author_list = []
    for i in authors:
        author = db.session.query(User).filter(User.id == i[0]).one()
        author_dict = dict(user_id=author.id,
                           avatar="{}avatar_{}".format(app.config['BASE_URL'], author.id),
                           nickname=author.nickname)
        author_list.append(author_dict)
    result = dict(num=len(author_list),
                  author_list=author_list)
    return jsonify(result)


@app.route('/user/self/', methods=['GET'])
@login_required
def current_user_info():
    user = g.user
    user_info = user_2_dict(user)
    return jsonify(user_info)


@app.route('/user/self/', methods=['POST'])
@login_required
def edit_user_info():
    intro = request.form.get('intro', '')
    province = request.form.get('province', '')
    city = request.form.get('city', '')
    district = request.form.get('district', '')
    profile_img = request.form.get('image', '')
    weixin_id = request.form.get('weixin', '')
    user = g.user
    profile = user.get_profile()
    user.province = province
    user.city = city
    user.district = district
    profile.intro = intro
    profile.weixin_id = weixin_id
    if profile_img:
        profile.profile_img = profile_img
    db.session.commit()
    user_info = user_2_dict(user)
    return jsonify(user_info)



@app.route('/user/info/', methods=['GET'])
@login_required
def get_user_info():
    userid = request.args.get('userid')
    try:
        user = load_user_by_id(int(userid))
    except:
        return jsonify({'error': 'wrong_user_id'})
    user_info = user_2_dict(user)
    user_info['is_following'] = g.user.is_following(userid)
    return jsonify(user_info)


@app.route('/user/<userid>/events/', methods=['GET'])
@login_required
def get_events_byid(userid):
    limit = 10
    start = request.args.get('start', '0')
    type = request.args.get('event_type', 'post')
    user = load_user_by_id(int(userid))
    if type == 'post':
        query = user.self_event().filter(Event.type == 1)
        query = query.order_by(Event.id.desc())
        events = query.offset(int(start)).limit(limit).all()
        message_list = events_2_dict(events)
    elif type == 'comment':
        query = user.self_event().filter((Event.type == 2) | (Event.type == 3) | (Event.type == 4))
        query = query.order_by(Event.id.desc())
        events = query.offset(int(start)).limit(limit).all()
        message_list = events_2_dict(events)
    else:
        messages = user.favo_messages[int(start): int(start)+limit]
        message_list = messages_2_list(messages)
    result = dict(num=len(message_list),
                  message_list=message_list)
    return jsonify(result)


@app.route('/user/<userid>/images/', methods=['GET'])
@login_required
def get_user_photos(userid):
    start = request.args.get('start', '0')
    user = load_user_by_id(int(userid))
    if not user:
        return jsonify({'error': 'wrong_user_id'})
    limit = 10
    query = user.self_photos().order_by(Image.id.desc())
    photos = photo_2_dict(query.offset(int(start)).limit(limit).all())
    result = dict(num=len(photos),
                  photo_list=photos)
    return jsonify(result)


@app.route('/user/notifies/', methods=['GET'])
@login_required
def get_user_notifies():
    start = request.args.get('start', '0')
    limit = 15
    query = g.user.self_notifies().filter(Notify.type != 6).order_by(Notify.id.desc())
    notifies = notify_2_dict(query.offset(int(start)).limit(limit).all())
    result = dict(num=len(notifies),
                  notify_list=notifies)
    return jsonify(result)


# -----------------------------------用户间交互----------------------------------

@app.route('/user/follow/<userid>/', methods=['POST'])
@login_required
def follow_user(userid):
    try:
        user = db.session.query(User).filter(User.id == int(userid)).one()
    except:
        return jsonify({'error': 'wrong_user_id'})
    if g.user.is_following(user.id):
        g.user.unfollow(user.id)
        message = {'followed': False}
    else:
        g.user.follow(user.id)
        message = {'followed': True}
    return jsonify(message)


@app.route('/user/chat/<userid>/', methods=['GET'])
@login_required
def get_chat_history(userid):
    start = request.args.get('start', '0')
    try:
        user = db.session.query(User).filter(User.id == int(userid)).one()
    except:
        return jsonify({'error': 'wrong_user_id'})
    limit = 15
    query = g.user.get_chat_history(userid).order_by(Event.id.desc())
    if start == '0':
        query = query.limit(limit)
    else:
        query = query.filter(Event.id < int(start))
    chats = chat_2_dict(query.all())
    result = dict(num=len(chats),
                  chat_list=chats[::-1])
    return jsonify(result)


@app.route('/user/chat/', methods=['GET'])
@login_required
def get_chat_list():
    chats = g.user.get_chat_list()
    chat_list = []
    for i in chats.keys():
        user = load_user_by_id(int(i))
        event = db.session.query(Event).filter(Event.id == chats[i]).one()
        message = event.get_message()
        unread = g.user.get_chat_unread(int(i)).count()
        chat_dict = dict(time=tools.timestamp_2_zh(event.time),
                         event_id=event.id,
                         body=message.body,
                         user_id=i,
                         user_nickname=user.nickname,
                         user_username=user.username,
                         user_avatar="{}avatar_{}".format(app.config['BASE_URL'], i),
                         unread=unread)
        chat_list.append(chat_dict)
    chat_list.sort(key=lambda x: x['event_id'], reverse=True)
    result = dict(num=len(chat_list),
                  chat_list=chat_list)
    return jsonify(result)


@app.route('/user/chat/<userid>/', methods=['POST'])
@login_required
def send_private_message(userid):
    body = request.form.get('body', '')
    try:
        user = db.session.query(User).filter(User.id == int(userid)).one()
    except:
        return jsonify({'error': 'wrong_user_id'})
    event = g.user.send_private_message(body, userid)
    message = event.get_message()
    chat_dict = dict(sponsor=event.sponsor,
                     associate=event.associate_user,
                     time=tools.timestamp_2_zh(event.time),
                     body=message.body,
                     message_id=message.id,
                     event_id=event.id)
    return jsonify(chat_dict)


# --------------------------------------------时间线相关接口----------------------------------------

def message_2_dict(i, login=True, constract=False):
    '''
    输入一个message对象，获取其dict格式的信息
    :param i: message对象
    :return: dict对象
    '''
    user = load_user_by_id(i.author_id)
    images = []
    message = dict(id=i.id,
                   type=i.type,
                   time_create=tools.timestamp_2_zh(i.time_create),
                   time_update=tools.timestamp_2_zh(i.time_update),
                   comment_count=str(i.comment_count),
                   quote_count=str(i.quote_count),
                   favo_count=str(i.favo_users.count()),
                   author_id=i.author_id,
                   nickname=user.nickname,
                   username=user.username,
                   avatar=app.config['BASE_URL'] + 'avatar_' + str(i.author_id))
    if login:
        message['is_favoed'] = g.user.is_favoed_message(i.id)
        message['is_quoted'] = g.user.is_quoted_message(i.id)
        message['is_comment'] = g.user.is_commented_message(i.id)

    if message['type'] == 10:
        message['body'] = '该推文已被作者删除'
    else:
        if constract:
            message['body'] = constract_message(i.body)
        else:
            message['body'] = i.body
        if i.images.count() > 0:
            for j in i.images:
                images.append(j.full_url())
    message['images'] = images
    return message


def messages_2_list(messages, login=True, constract=False):
    message_list = []
    for i in messages:
        message = message_2_dict(i, login, constract)
        message['time'] = tools.timestamp_2_zh(i.time_create)
        message['event_id'] = message['id']
        if i.type == 0:
            message['type'] = 1
        elif i.type == 1:
            message['type'] = 3
        elif i.type == 2:
            message['type'] = 2
            message['quoted'] = message_2_dict(i.get_quoted_message(), login, constract)
        message_list.append(message)
    return message_list


def events_2_dict(events):
    message_list = []
    if events:
        id_list = []
        for i in events:
            if i.type == 1:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                if message['id'] not in id_list:
                    message_list.append(message)
                    id_list.append(message['id'])
            elif i.type == 2 or i.type == 3:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['quoted'] = message_2_dict(i.get_message().get_quoted_message())
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                if message['quoted']['id'] not in id_list:
                    message_list.append(message)
                    id_list.append(message['quoted']['id'])
            elif i.type == 4 or i.type == 5:
                message = message_2_dict(i.get_message())
                message['type'] = i.type
                message['sponsor_nickname'] = i.get_sponsor().nickname
                try:
                    message['quoted'] = message_2_dict(i.get_message().get_quoted_message())
                except:
                    pass
                message['sponsor_id'] = i.sponsor
                message['associate_id'] = i.associate_user
                message['time'] = tools.timestamp_2_zh(i.time)
                message['event_id'] = i.id
                if message['id'] not in id_list:
                    message_list.append(message)
                    id_list.append(message['id'])
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
                             url=app.config['BASE_URL'] + i.url,
                             relate_message=i.relate_message,
                             id=i.id)
            relate_message = db.session.query(Message).filter(Message.id == i.relate_message).one()
            photodict['caption'] = relate_message.body
            photo_list.append(photodict)
    return photo_list


@app.route('/messages/', methods=['GET'])
@login_required
def get_messages_list():
    start = request.args.get('start', '0')
    channel_name = request.args.get('channel', '')
    limit = 10
    channel = db.session.query(Channel).filter(Channel.name == channel_name).one()
    message_list = messages_2_list(channel.messages[int(start):int(start)+limit])
    result = dict(num=len(message_list),
                  message_list=message_list[::-1])
    return jsonify(result)


@app.route('/messages/<id>/', methods=['GET'])
def get_message(id):
    message = db.session.query(Message).filter(Message.id == id).one()
    message_dict = message_2_dict(message, constract=True)
    if (message.type == 1) or (message.type == 2):
        quoted = db.session.query(Message).filter(Message.id == message.quote_id).one()
        message_dict['quoted'] = message_2_dict(quoted)
    return jsonify(message_dict)


@app.route('/messages/<id>/replies/', methods=['GET'])
def get_replies(id):
    limit = 10
    start = request.args.get('start', '0')
    query = db.session.query(Message).filter(Message.quote_id == id).order_by(Message.id.desc())
    reply_count = query.count()
    replies = query.offset(int(start)).limit(limit)
    replies_list = []
    for i in replies:
        reply = message_2_dict(i)
        query = db.session.query(Message).filter(Message.quote_id == i.id).order_by(Message.id.desc())
        replies_2_reply = query.limit(3)
        replies_2_list = []
        for j in replies_2_reply:
            reply_2_reply = message_2_dict(j)
            replies_2_list.append(reply_2_reply)
        reply['reply'] = replies_2_list
        replies_list.append(reply)
    return jsonify({'count': reply_count, 'replies': replies_list})


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


@app.route('/moments/', methods=['GET'])
def get_moments():
    limit = 6
    start = request.args.get('start', '0')
    query = db.session.query(Moment).order_by(Moment.id.desc())
    moments = query.offset(int(start)).limit(limit).all()
    moment_list = []
    for i in moments:
        message = message_2_dict(i.get_message(), login=False)
        if message['type'] == 2 or message['type'] == 1:
            message['quoted'] = message_2_dict(i.get_message().get_quoted_message(), login=False)
        moment_list.append(message)
    result = dict(num=len(moment_list),
                  moment_list=moment_list)
    return jsonify(result)


@app.route('/channels/', methods=['GET'])
def get_channels():
    limit = 5
    start = request.args.get('start', '0')
    range = request.args.get('range', '500')
    method = request.args.get('method', 'comment')  # 暂时只能通过评论数来对channel下的Message进行排序
    query = db.session.query(channel_2_message.c.channel_id, func.count(channel_2_message.c.channel_id)).group_by(
        channel_2_message.c.channel_id).order_by(
        func.count(channel_2_message.c.channel_id).desc())  # todo: 把对参与计算的message的range纳入计算
    channels = query.offset(start).limit(limit).all()
    channel_list = []
    for i in channels:
        message_count = db.session.query(channel_2_message).filter(channel_2_message.c.channel_id == i[0]).count()
        channel = db.session.query(Channel).filter(Channel.id == i[0]).one()
        message = channel.most_comment_message().first()
        channel_dict = dict(channel_name=channel.name,
                            message_count=message_count,
                            message=message_2_dict(message, login=False))
        channel_list.append(channel_dict)
    result = dict(num=len(channel_list),
                  channel_list=channel_list)
    return jsonify(result)


# --------------------------------------搜索相关接口---------------------------------

@app.route('/search/user/', methods=['GET'])
def search_user():
    username = request.args.get('username', '')
    limit = int(request.args.get('limit', '6'))
    start = int(request.args.get('start', '0'))
    find_users = User.query.filter(User.username.contains(username)).offset(start).limit(limit).all()
    users = []
    for i in find_users:
        user = user_2_dict(i, simple=True)
        users.append(user)
    result = dict(num=len(users),
                  user_list=users)
    return jsonify(result)


@app.route('/search/channel/', methods=['GET'])
def search_channel():
    channel_name = request.args.get('channel', '')
    limit = int(request.args.get('limit', '6'))
    start = int(request.args.get('start', '0'))
    find_channels = Channel.query.whoosh_search(channel_name).offset(start).limit(limit).all()
    channels = []
    for i in find_channels:
        channel = dict(name=i.name,
                       id=i.id)
        channels.append(channel)
    result = dict(num=len(channels),
                  channel_list=channels)
    return jsonify(result)


@app.route('/search/message/', methods=['GET'])
def search_message():
    body= request.args.get('body', '')
    limit = int(request.args.get('limit', '4'))
    start = int(request.args.get('start', '0'))
    find_message = Message.query.whoosh_search(body).limit(limit).all()
    message_list = []
    if find_message:
        message_list = messages_2_list(find_message, login=False)
    result = dict(num=len(message_list),
                  message_list=message_list[::-1])
    return jsonify(result)

# ---------------------------------------推文操作相关接口-----------------------------


@app.route('/qiniu/uptoken', methods=['GET'])
def generate_upload_token():
    token = tools.qiniu_token()
    return jsonify({'uptoken': token})


@app.route('/message/del/', methods=['POST'])
@login_required
def del_message():
    message_id = request.form.get('message_id', '0')
    try:
        message = db.session.query(Message).filter(Message.id == message_id).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    if message.author_id == g.user.id:
        message.type = 10
        message.update()
    else:
        return jsonify({'error': 'Permission denied'})


@app.route('/message/favo/', methods=['GET', 'POST'])
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
    return jsonify({'favo': favo, 'count': str(favo_count)})


@app.route('/message/reply/', methods=['POST'])
@login_required
def reply_message():
    message_id = request.form.get('message_id', '0')
    comment = request.form.get('comment', ' ')
    try:
        message = db.session.query(Message).filter(Message.id == int(message_id)).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    reply = g.user.comment_message(comment, int(message_id))
    return jsonify({'status': 'success', 'messageId': reply.id})


@app.route('/message/retweet/', methods=['POST'])
@login_required
def retweet_message():
    message_id = request.form.get('message_id', '0')
    body = request.form.get('body', ' ')
    try:
        message = db.session.query(Message).filter(Message.id == int(message_id)).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    event = g.user.quote_message(body=body, quoted_id=message_id)
    return jsonify({'status': 'success', 'quotecount': message.quote_count, 'messageId': event.associate_message})


@app.route('/message/', methods=['POST'])
@login_required
def post_message():
    body = request.form.get('body', ' ')
    message = g.user.create_message(body)
    return jsonify({'status': 'success', 'messageId': message.id})


@app.route('/message/uploadimg/', methods=['POST'])
@login_required
def add_img():
    message_id = request.form.get('message_id', '0')
    url = request.form.get('url', '')
    try:
        message = db.session.query(Message).filter(Message.id == int(message_id)).one()
    except:
        return jsonify({'error': 'wrong_message_id'})
    if message.author_id == g.user.id:
        message.add_images(url)
        return jsonify({'status': 'success', 'messageId': message.id})
    else:
        return jsonify({'error': 'Permission denied'})


@app.route('/user/notifies/read/', methods=['POST'])
@login_required
def read_notify():
    notify_id = request.form.get('notify_id', 0)
    try:
        notify = db.session.query(Notify).filter(Notify.id == int(notify_id)).one()
    except:
        return jsonify({'error': 'wrong_notify_id'})
    if notify.user == g.user.id:
        notify.read_notify()
        return jsonify({'status': 'success', 'read': 1})
    else:
        return jsonify({'error': 'Permission denied'})
