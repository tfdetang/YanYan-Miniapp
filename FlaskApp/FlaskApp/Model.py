try:
    from FlaskApp.FlaskApp import app, db
except:
    import sys

    sys.path.append('..')
    from FlaskApp import app, db
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Table, func
from sqlalchemy.orm import relationship, backref
from sqlalchemy.ext.declarative import declarative_base, DeclarativeMeta
from flask_login import UserMixin
import flask_whooshalchemyplus as whooshalchemy
from jieba.analyse import ChineseAnalyzer
import time, datetime

from FlaskApp.utils import tools

Base = declarative_base()


# ===============================================Util_tools===================================

class Utils:
    def save(self):
        db.session.add(self)
        db.session.commit()

    def update(self):
        db.session.merge(self)
        db.session.commit()


# ===============================================Associate_obj================================

follower = Table('follower', Base.metadata,
                 Column('follower_id', Integer, ForeignKey('user.id')),
                 Column('followed_id', Integer, ForeignKey('user.id')))

channel_2_message = Table('channel_2_message', Base.metadata,
                          Column('channel_id', Integer, ForeignKey('channel.id')),
                          Column('message_id', Integer, ForeignKey('message.id')))

message_favo = Table('message_favo', Base.metadata,
                     Column('message_id', Integer, ForeignKey('message.id')),
                     Column('user_id', Integer, ForeignKey('user.id')))

message_comment = Table('message_comment', Base.metadata,
                        Column('message_id', Integer, ForeignKey('message.id')),
                        Column('user_id', Integer, ForeignKey('user.id')))

message_quoted = Table('message_quoted', Base.metadata,
                       Column('message_id', Integer, ForeignKey('message.id')),
                       Column('user_id', Integer, ForeignKey('user.id')))


# ==============================================Model==========================================


# ---------------------------------------------Auth_obj---------------------------------------

class Token(Base, Utils, db.Model):
    '''
    id ：token的编号
    bind_user : token属于哪个用户
    secret : token密钥内容
    status ： token的状态 0 未使用 1 已验证 2 已过期
    '''

    __tablename__ = 'token'

    id = Column(Integer, primary_key=True, autoincrement=True)
    bind_user = Column(Integer)
    secret = Column(String(30))
    create_time = Column(String(20))
    status = Column(Integer)

    def check_expire(self, expire_by=36000):
        '''
        检查token是否过期
        :param expire_by: 过期时间（秒）
        :return: T：未过期 or F:已过期
        '''
        t_now = tools.timestamp_2_time(time.time())
        t_create = tools.timestamp_2_time(self.create_time)
        t_gap = t_now - t_create
        if t_gap < datetime.timedelta(seconds=expire_by):
            return True
        else:
            self.set_status('expired')
            return False

    def bind(self, userid):
        '''
        绑定token与用户
        :param userid: 用户id
        :return: T: 绑定成功
        '''
        self.bind_user = userid
        self.create_time = tools.generate_timestamp()
        self.status = 0
        self.update()
        return True

    def set_status(self, status='expired'):
        '''
        设定token的状态
        :param status: used代表token已经验证过，expired代表token已经过期
        :return:
        '''
        if status == 'expired':
            self.status = 1
            self.update()

    def __repr__(self):
        return '<Token %s>' % self.id


# -----------------------------------------------Core_obj-------------------------------

class User(Base, Utils, db.Model, UserMixin):
    __tablename__ = 'user'
    __searchable__ = ['nickname']
    __analyzer__ = ChineseAnalyzer()

    id = Column(Integer, primary_key=True, autoincrement=True)
    openid = Column(String(45))
    nickname = Column(String(45))
    username = Column(String(45))
    sex = Column(Integer)
    city = Column(String(20))
    province = Column(String(20))
    country = Column(String(20))
    district = Column(String(20))
    subscribe_time = Column(String(20))
    subscribe_status = Column(Integer)
    profile = relationship('Extra_user_profile',
                           backref=backref('profile_user'),
                           lazy='dynamic')
    messages = relationship('Message',
                            backref=backref('m_author'),
                            lazy='dynamic')
    followed = relationship('User',
                            secondary=follower,
                            primaryjoin=(follower.c.follower_id == id),
                            secondaryjoin=(follower.c.followed_id == id),
                            backref=backref('followers', lazy='dynamic'),
                            lazy='dynamic')
    favo_messages = relationship('Message',
                                 secondary=message_favo,
                                 lazy='dynamic')
    commented_messages = relationship('Message',
                                      secondary=message_comment,
                                      lazy='dynamic')
    quoted_messages = relationship('Message',
                                   secondary=message_quoted,
                                   lazy='dynamic')

    def is_authenticate(self):
        return True

    def is_active(self):
        return True

    def is_anonymous(self):
        return False

    def get_id(self):
        try:
            return self.id
        except:
            return None

    def add_role(self, role_name='user'):
        role = Role(userid=self.id,
                    rolename=role_name)
        role.save()
        return role

    def is_role(self, role_name):
        return db.session.query(Role).filter((Role.userid == self.id) & (Role.rolename == role_name)).count() > 0

    def generate_login_key(self):
        token = Token(secret=tools.generate_token('30'))
        token.save()
        token.bind(self.id)
        return token

    def set_profile(self, intro='', profile_img='', weixin_id='', privacy=3):
        profile = Extra_user_profile(intro=intro,
                                     profile_img=profile_img,
                                     weixin_id=weixin_id,
                                     privacy=privacy)
        self.profile.append(profile)
        self.save()
        return self

    def get_profile(self):
        return self.profile.first()

    def follow(self, user_id):
        try:
            user = db.session.query(User).filter(User.id == user_id).one()
        except:
            return False
        if not self.is_following(user_id):
            self.followed.append(user)
            self.save()
            event = Event(sponsor=self.id,
                          associate_user=user_id,
                          time=tools.generate_timestamp(),
                          type=7)
            event.save()
            event.generate_notify()
            return self

    def unfollow(self, user_id):
        try:
            user = db.session.query(User).filter(User.id == user_id).one()
        except:
            return False
        if self.is_following(user_id):
            self.followed.remove(user)
            self.save()
            event = Event(sponsor=self.id,
                          associate_user=user_id,
                          time=tools.generate_timestamp(),
                          type=8)
            event.save()
            event.generate_notify()
            return self

    def is_following(self, user_id):
        return self.followed.filter(follower.c.followed_id == user_id).count() > 0

    def followed_message(self):
        return db.session.query(Message).join(follower, (follower.c.followed_id == Message.author_id)) \
            .filter(follower.c.follower_id == self.id).filter(Message.type != 1) \
            .order_by(Message.time_update.desc())

    def followed_event(self):
        return db.session.query(Event).join(follower, (follower.c.followed_id == Event.sponsor)).join(Message, (
            Message.id == Event.associate_message)) \
            .filter(follower.c.follower_id == self.id).filter(Message.type != 10).filter(
            (Event.type == 1) | (Event.type == 2) | ((Event.type == 4) & (Event.sponsor != self.id)) | (
                (Event.type == 5) & (Event.sponsor != self.id)) | ((Event.type == 7) & (Event.sponsor != self.id)))

    def self_event(self):
        return db.session.query(Event).join(Message, (Message.id == Event.associate_message)).filter(
            Message.type != 10).filter(Event.sponsor == self.id)

    def self_photos(self):
        return db.session.query(Image).filter(Image.uploader == self.id)

    def self_notifies(self):
        return db.session.query(Notify).filter(Notify.user == self.id)

    def post_message(self, body, type=0):
        channels = tools.match_channel(body + ' ')
        usernames = tools.match_person(body + ' ')
        body = body[:260]
        time = tools.generate_timestamp()
        message = Message(body=body,
                          time_create=time,
                          time_update=time,
                          author_id=self.id,
                          type=type,
                          comment_count=0,
                          quote_count=0)
        message.save()
        for i in channels:
            message.add_channel(i[1:-1])
        for i in usernames:
            message.at_user(i[1:-1])
        return message

    def create_message(self, body):
        message = self.post_message(body)
        event = Event(sponsor=self.id,
                      associate_message=message.id,
                      time=tools.generate_timestamp(),
                      type=1)
        event.save()
        return message

    def comment_message(self, comment, comment_id):
        message = self.post_message(comment)
        message.quote_id = comment_id
        message.type = 1
        message.update()
        commented_message = db.session.query(Message).filter(Message.id == comment_id).one()
        commented_message.comment_count += 1
        self.commented_messages.append(commented_message)
        commented_message.update()
        event = Event(sponsor=self.id,
                      associate_message=message.id,
                      time=tools.generate_timestamp(),
                      associate_user=commented_message.author_id,
                      type=3)
        event.save()
        event.generate_notify()
        self.update()
        return message

    def quote_message(self, body, quoted_id):
        quoted_message = db.session.query(Message).filter(Message.id == quoted_id).one()
        quoted_message.quote_count += 1
        type = 2
        self.quoted_messages.append(quoted_message)
        if body:
            self.commented_messages.append(quoted_message)  # 如果转发的时候带文字，则也算入评论中
            quoted_message.comment_count += 1
            message = self.post_message(body)
            message.quote_id = quoted_id
            message.type = type
            event = Event(sponsor=self.id,
                          associate_message=message.id,
                          time=tools.generate_timestamp(),
                          associate_user=quoted_message.author_id,
                          type=type)
            message.update()
        else:
            type = 4
            event = Event(sponsor=self.id,
                          associate_message=quoted_id,
                          time=tools.generate_timestamp(),
                          associate_user=quoted_message.author_id,
                          type=type)
        event.save()
        event.generate_notify()
        quoted_message.update()
        self.update()
        return event

    def is_quoted_message(self, message_id):
        return self.quoted_messages.filter(message_quoted.c.message_id == message_id).count() > 0

    def is_commented_message(self, message_id):
        return self.commented_messages.filter(message_comment.c.message_id == message_id).count() > 0

    def is_favoed_message(self, message_id):
        return self.favo_messages.filter(message_favo.c.message_id == message_id).count() > 0

    def favo_message(self, message_id):
        if not self.is_favoed_message(message_id):
            message = db.session.query(Message).filter(Message.id == message_id).one()
            self.favo_messages.append(message)
            self.update()
            event = Event(sponsor=self.id,
                          associate_message=message_id,
                          time=tools.generate_timestamp(),
                          associate_user=message.author_id,
                          type=5)
            event.save()
            event.generate_notify()
            return self

    def unfavo_message(self, message_id):
        if self.is_favoed_message(message_id):
            message = db.session.query(Message).filter(Message.id == message_id).one()
            self.favo_messages.remove(message)
            events = db.session.query(Event).filter(
                (Event.type == 5) & (Event.sponsor == self.id) & (Event.associate_message == message_id)).all()
            for i in events:
                i.type = 10
                i.time = tools.generate_timestamp()
            db.session.commit()
            return self

    def send_private_message(self, body, send_id):
        try:
            user = db.session.query(User).filter(User.id == send_id).one()
        except:
            return False
        message = self.post_message(body, 4)
        event = Event(sponsor=self.id,
                      associate_message=message.id,
                      time=tools.generate_timestamp(),
                      associate_user=send_id,
                      type=6)
        event.save()
        event.generate_notify()
        return event

    def get_chat_history(self, userid):
        try:
            user = db.session.query(User).filter(User.id == userid).one()
        except:
            return False
        query = db.session.query(Event).filter(Event.type == 6).filter(
            (Event.sponsor == self.id) | (Event.associate_user == self.id)).filter(
            (Event.sponsor == userid) | (Event.associate_user == userid))
        return query

    def get_chat_list(self):
        receive_list = db.session.query(Event.sponsor, func.max(Event.id)).filter(
            (Event.type == 6) & (Event.associate_user == self.id)).group_by(Event.sponsor).order_by(
            func.max(Event.id).desc()).all()
        send_list = db.session.query(Event.associate_user, func.max(Event.id)).filter(
            (Event.type == 6) & (Event.sponsor == self.id)).group_by(Event.associate_user).order_by(
            func.max(Event.id).desc()).all()
        chat = {}
        for i in receive_list:
            chat[str(i[0])] = i[1]

        for j in send_list:
            try:
                chat[str(j[0])] = max(chat[str(j[0])], j[1])
            except:
                chat[str(j[0])] = j[1]
        return chat

    def get_chat_unread(self, userid):
        unread = db.session.query(Notify).join(Event).filter(
            (Notify.type == 6) & (Notify.read == 0)).filter(
            ((Event.sponsor == userid) & (Event.associate_user == self.id)))
        return unread

    def __repr__(self):
        return '<User %s>' % self.nickname


class Event(Base, db.Model, Utils):
    '''
    id: 业务流水号
    sponsor: 业务发起人
    associate_message: 关联的消息
    associate_user： 关联的用户
    time：业务发起时间
    type: 业务类型：1: 发送Message 2: 转发&评论Message 3: 评论Message 4：转发Message 5: 喜欢Message
                   6: 私信 7: 关注用户 8： 取消关注 9：@用户 10: 取消喜欢Message
    remarks: 业务备注
    '''
    __tablename__ = 'event'

    id = Column(Integer, primary_key=True, autoincrement=True)
    sponsor = Column(Integer)
    associate_message = Column(Integer)
    associate_user = Column(Integer)
    time = Column(String(45))
    type = Column(Integer)
    remarks = Column(String(45))
    notifies = relationship('Notify',
                            backref=backref('notified_event'))

    def get_sponsor(self):
        return db.session.query(User).filter(User.id == self.sponsor).one()

    def get_message(self):
        return db.session.query(Message).filter(Message.id == self.associate_message).one()

    def get_associateuser(self):
        return db.session.query(User).filter(User.id == self.associate_user).one()

    def generate_notify(self):
        notify = Notify(user=self.associate_user,
                        event=self.id,
                        type=self.type,
                        read=0)
        notify.save()
        return notify

    def __repr__(self):
        return '<Event %s>' % self.id


class Channel(Base, db.Model, Utils):
    __tablename__ = 'channel'
    __searchable__ = ['name']
    __analyzer__ = ChineseAnalyzer()

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(45))
    introduce = Column(Text)
    creator = Column(ForeignKey('user.id'))
    messages = relationship('Message',
                            secondary='channel_2_message',
                            backref='m_channel',
                            lazy='dynamic')

    def creat_channel(self):
        if not self.is_channel(self.name):
            new_theme = Channel(name=self.name,
                                introduce=self.introduce,
                                creator=self.creator)
            new_theme.save()

    def is_channel(self, name):
        return db.session.query(Channel).filter(Channel.name == name).count() > 0

    def message_count(self):
        return db.session.query(channel_2_message).filter(channel_2_message.c.channel_id == self.id).count()

    def most_comment_message(self):
        query = db.session.query(Message).join(channel_2_message,
                                               channel_2_message.c.message_id == Message.id).filter(
            channel_2_message.c.channel_id == self.id).order_by(
            Message.comment_count.desc())
        return query

    def __repr__(self):
        return '<Channel %s>' % self.name


class Message(Base, db.Model, Utils):
    '''
    id: Message流水号
    body: Message正文
    time_create: 创建时间
    time_update: 修改时间
    comment_count: 评论数量
    quote_count: 引用数量
    author_id: 创建者
    quote_id: 引用的推文id
    type:  Message的类型：0 普通Message, 1 回复Message, 2 回复&转发Message，3 转发Message, 4 私信Message, 10 被用户删除
    '''
    __tablename__ = 'message'
    __searchable__ = ['body']
    __analyzer__ = ChineseAnalyzer()

    id = Column(Integer, primary_key=True, autoincrement=True)
    body = Column(Text(260))
    time_create = Column(String(45))
    time_update = Column(String(45))
    comment_count = Column(Integer)
    quote_count = Column(Integer)
    author_id = Column(ForeignKey('user.id'))
    quote_id = Column(Integer)
    type = Column(Integer)
    channels = relationship('Channel',
                            secondary='channel_2_message',
                            backref='c_message',
                            lazy='dynamic')
    images = relationship('Image',
                          backref='img_Message',
                          lazy='dynamic')
    favo_users = relationship('User',
                              secondary=message_favo,
                              lazy='dynamic')
    quote_users = relationship('User',
                               secondary=message_quoted,
                               lazy='dynamic')

    def get_quoted_message(self):
        return db.session.query(Message).filter(Message.id == self.quote_id).one()

    def add_channel(self, channel_name, introduce=''):
        '''
        将一条消息加入一个频道，如没有该频道则创建
        :param channel_name: 频道名称
        :param introduce: 介绍
        :return: Message
        '''
        if db.session.query(Channel).filter(Channel.name == channel_name).count() > 0:
            channel = db.session.query(Channel).filter(Channel.name == channel_name).first()
        else:
            channel = Channel(name=channel_name,
                              introduce=introduce,
                              creator=self.author_id)
        self.channels.append(channel)
        self.save()
        return self

    def at_user(self, username):
        try:
            user = db.session.query(User).filter(User.username == username).one()
        except:
            return False
        event = Event(sponsor=self.author_id,
                      associate_message=self.id,
                      associate_user=user.id,
                      time=tools.generate_timestamp(),
                      type=9)
        event.save()
        return event.generate_notify()

    def add_images(self, img_url):
        if self.images.count() < 5:
            image = Image(uploader=self.author_id,
                          uploade_time=tools.generate_timestamp(),
                          url=img_url)
            self.images.append(image)
            self.save()
        return self

    def __repr__(self):
        return '<Message %s>' % self.id


class Moment(Base, db.Model, Utils):
    __tablename__ = 'moment'

    id = Column(Integer, primary_key=True, autoincrement=True)
    message_id = Column(Integer)
    time = Column(String(45))

    def get_message(self):
        return db.session.query(Message).filter(Message.id == self.message_id).one()


# ----------------------------------------------Additional_obj-------------------------

class Notify(Base, db.Model, Utils):
    '''
    id: 通知流水号
    user: 所通知用户的id
    event: 所对应的事件
    type: 事件的类型（同event）
    read: 是否已读（0 未读，1 已读）
    '''
    __tablename__ = 'notify'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user = Column(ForeignKey('user.id'))
    event = Column(ForeignKey('event.id'))
    type = Column(Integer)
    read = Column(Integer)

    def read_notify(self):
        self.read = 1
        self.update()
        return self

    def __repr__(self):
        return '<Notification %s>' % self.id


class Role(Base, Utils, db.Model):
    __tablename__ = 'role'

    id = Column(Integer, primary_key=True, autoincrement=True)
    userid = Column(Integer)
    rolename = Column(String(20))

    def __repr__(self):
        return '<Role %s>' % self.id


class Extra_user_profile(Base, db.Model, Utils):
    __tablename__ = 'extra_user_profile'
    __searchable__ = ['intro']
    __analyzer__ = ChineseAnalyzer()

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(ForeignKey('user.id'))
    intro = Column(String(260))
    profile_img = Column(String(50))
    weixin_id = Column(String(50))
    privacy = Column(Integer)  # 0: 公开微信号 1：关注我的人  2：互相关注  3：不公开

    def __repr__(self):
        return '<Profile %s>' % self.user_id


class Image(Base, db.Model, Utils):
    __tablename__ = 'image'

    id = Column(Integer, primary_key=True, autoincrement=True)
    relate_message = Column(ForeignKey('message.id'))
    uploader = Column(ForeignKey('user.id'))
    uploade_time = Column(String(45))
    url = Column(String(50))

    def full_url(self):
        base_url = app.config['BASE_URL'] + '/'
        return base_url + self.url

    def __repr__(self):
        return '<Image %s>' % self.id


# ---------------------------------------------简历搜索index--------------------------

whooshalchemy.whoosh_index(app, User)
whooshalchemy.whoosh_index(app, Message)
whooshalchemy.whoosh_index(app, Channel)

# ---------------------------------test-----------------------------------------------
if __name__ == '__main__':

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, relationship, backref, scoped_session

    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], pool_size=120,
                           pool_recycle=20)
    session_factory = sessionmaker(bind=engine)
    DBSession = scoped_session(session_factory)
    if app.config['DROP_ALL']:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    with app.app_context():
        user1 = db.session.query(User).filter(User.id == 1).one()
        user2 = db.session.query(User).filter(User.id == 2).one()
        user3 = db.session.query(User).filter(User.id == 3).one()
        user4 = db.session.query(User).filter(User.id == 4).one()
        user5 = db.session.query(User).filter(User.id == 5).one()
        user6 = db.session.query(User).filter(User.id == 6).one()

        user1.add_role()
        user1.add_role('admin')
        user2.add_role()
        user3.add_role()
        user4.add_role()
        user5.add_role()
        user6.add_role()

        print(user1.is_role('admin'))

        '''
        print(user2.is_favoed_message(1))
        print(user2.get_chat_list().keys(), user2.get_chat_list().values())
        print(user2.get_chat_unread(4).all())

        authors = db.session.query(Message.author_id, func.count(Message.author_id)).filter(Message.type != 4).group_by(Message.author_id).order_by(
            func.count(Message.author_id).desc())
        print(authors.all())
        '''
