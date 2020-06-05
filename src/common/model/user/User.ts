import SafeUtil from '../../util/SafeUtil';
import BaseEntity from '../base/BaseEntity';
import {UserRole} from './UserRole';
import {UserStatus} from "./UserStatus";

export default class User extends BaseEntity {

  //获取当前登录者的信息
  static URL_INFO = '/api/user/info';

  static URL_LOGIN = '/api/user/login'
  static URL_AUTHENTICATION_LOGIN = '/api/user/authentication/login'
  static URL_REGISTER = '/api/user/register'
  static URL_LOGOUT = '/api/user/logout'
  static URL_USER_CHANGE_PASSWORD = '/api/user/change/password'
  static URL_USER_RESET_PASSWORD = '/api/user/reset/password'
  static URL_USER_TOGGLE_STATUS = '/api/user/toggle/status'
  static URL_USER_TRANSFIGURATION = '/api/user/transfiguration'

  role: UserRole = UserRole.GUEST
  username: string | null = null
  password: string | null = null
  avatarUrl: string | null = null
  lastIp: string | null = null
  lastTime: string | null = null
  //默认大小限制100Mb.
  sizeLimit: number = 104857600
  totalSize: number = 0
  totalSizeLimit: number = -1
  status: UserStatus = UserStatus.OK

  //****************本地临时变量****************/
  //是否已经登录
  isLogin: boolean = false;

  constructor(reactComponent?: React.Component) {

    super(reactComponent);

  }


  assign(obj: any) {
    super.assign(obj);

  }

  getForm(): any {
    return {
      username: this.username,
      password: this.password,
      uuid: this.uuid ? this.uuid : null,
    };
  }

  //登录
  httpLogin(username: string, password: string, successCallback?: any, errorCallback?: any, finalCallback?: any) {

    let that = this;

    let form = {
      username,
      password,
    };

    this.httpGet(User.URL_LOGIN, form, function (response: any) {

      that.assign(response.data.data);

      SafeUtil.safeCallback(successCallback)(response);

    }, errorCallback, finalCallback);

  }


}



