import React from "react";
import Matter from "../../../common/model/matter/Matter";
import TankComponent from "../../../common/component/TankComponent";
import Director from "./Director";
import "./MatterPanel.less";
import Sun from "../../../common/model/global/Sun";
import StringUtil from "../../../common/util/StringUtil";
import DateUtil from "../../../common/util/DateUtil";
import AnimateUtil from "../../../common/util/AnimateUtil";
import MessageBoxUtil from "../../../common/util/MessageBoxUtil";
import Expanding from "../../widget/Expanding";
import {
  LockOutlined,
  UnlockOutlined,
  DownloadOutlined,
  ExclamationCircleFilled,
  LinkOutlined,
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  EllipsisOutlined,
  RedoOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { Modal, Checkbox, Tooltip, Dropdown, Menu, Space } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import SafeUtil from "../../../common/util/SafeUtil";
import ClipboardUtil from "../../../common/util/ClipboardUtil";
import Lang from "../../../common/model/global/Lang";
import MatterDeleteModal from "./MatterDeleteModal";

interface IProps {
  matter: Matter;
  recycleMode?: boolean; // 回收站模式，默认false，简化相关操作，不可进入文件夹里
  director?: Director;
  onCreateDirectoryCallback?: () => any;
  onDeleteSuccess?: () => any;
  onRecoverySuccess?: () => any;
  onCheckMatter?: (matter?: Matter) => any;
  onPreviewImage?: (matter: Matter) => any;
  onGoToDirectory?: (id: string) => any;
}

interface IState { }

export default class MatterPanel extends TankComponent<IProps, IState> {
  // 正在重命名的临时字段
  renameMatterName: string = "";
  // 正在向服务器提交rename的请求
  renamingLoading: boolean = false;
  // 小屏幕下操作栏
  showMore: boolean = false;

  inputRef = React.createRef<HTMLInputElement>();

  constructor(props: IProps) {
    super(props);
    this.state = {};
  }

  prepareRename() {
    const { matter, director } = this.props;
    if (director!.isEditing()) {
      console.error("导演正忙着，不予执行");
      return;
    }

    //告诉导演，自己正在编辑
    director!.renameMode = true;
    matter.editMode = true;
    this.renameMatterName = matter.name!;
    this.updateUI();
    setTimeout(() => {
      if (!this.inputRef.current) return;
      //如果是文件夹，全选中
      let dotIndex = matter.name!.lastIndexOf(".");
      if (dotIndex === -1) {
        AnimateUtil.setInputSelection(
          this.inputRef.current,
          0,
          this.renameMatterName.length
        );
      } else {
        AnimateUtil.setInputSelection(this.inputRef.current, 0, dotIndex);
      }
    });
  }

  clipboard() {
    let textToCopy = this.props.matter.getDownloadUrl();
    ClipboardUtil.copy(textToCopy, () => {
      MessageBoxUtil.success(Lang.t("operationSuccess"));
    });
  }

  deleteMatter() {
    MatterDeleteModal.open(
      () => {
        this.props.matter.httpSoftDelete(() => {
          MessageBoxUtil.success(Lang.t("operationSuccess"));
          this.props.onDeleteSuccess!();
        });
      },
      () => {
        this.props.matter.httpDelete(() => {
          MessageBoxUtil.success(Lang.t("operationSuccess"));
          this.props.onDeleteSuccess!();
        });
      }
    );
  }

  hardDeleteMatter() {
    Modal.confirm({
      title: Lang.t("actionCanNotRevertConfirm"),
      icon: <ExclamationCircleFilled twoToneColor="#FFDC00" />,
      onOk: () => {
        this.props.matter.httpDelete(() => {
          MessageBoxUtil.success(Lang.t("operationSuccess"));
          this.props.onDeleteSuccess!();
        });
      },
    });
  }

  recoveryMatter() {
    Modal.confirm({
      title: Lang.t("actionRecoveryConfirm"),
      icon: <ExclamationCircleFilled twoToneColor="#FFDC00" />,
      onOk: () => {
        this.props.matter.httpRecovery(() => {
          MessageBoxUtil.success(Lang.t("operationSuccess"));
          this.props.onRecoverySuccess!();
        });
      },
    });
  }

  changeMatterName(e: any) {
    this.renameMatterName = e.currentTarget.value;
    this.updateUI();
  }

  finishRename() {
    //有可能按enter的时候和blur同时了。
    if (this.renamingLoading) {
      return;
    }
    const { matter, director } = this.props;
    this.renamingLoading = true;

    matter.httpRename(
      this.renameMatterName,
      () => {
        this.renamingLoading = false;
        MessageBoxUtil.success(Lang.t("operationSuccess"));
        //告诉导演，自己编辑完毕
        director!.renameMode = false;
        matter.editMode = false;
      },
      (msg: string) => {
        this.renamingLoading = false;
        MessageBoxUtil.error(msg);
        //告诉导演，自己编辑完毕
        director!.renameMode = false;
        matter.editMode = false;
      },
      () => this.updateUI()
    );
  }

  finishCreateDirectory() {
    const { matter, director, onCreateDirectoryCallback } = this.props;
    matter.name = this.renameMatterName;
    matter.httpCreateDirectory(
      () => {
        director!.createMode = false;
        matter.editMode = false;
        matter.assign(new Matter());
      },
      (msg: string) => {
        director!.createMode = false;
        matter.editMode = false;
        MessageBoxUtil.error(msg);
      },
      () => onCreateDirectoryCallback!()
    );
  }

  blurTrigger() {
    const { matter, director } = this.props;
    if (matter.editMode) {
      if (director!.createMode) {
        this.finishCreateDirectory();
      } else if (director!.renameMode) {
        this.finishRename();
      }
    }
  }

  enterTrigger(e: any) {
    if (e.key.toLowerCase() === "enter") {
      this.inputRef.current!.blur();
    }
  }

  changePrivacy(privacy: boolean) {
    this.props.matter.httpChangePrivacy(privacy, () => {
      this.updateUI();
    });
  }

  checkToggle(e: CheckboxChangeEvent) {
    this.props.matter.check = e.target.checked;
    this.props.onCheckMatter!(this.props.matter);
  }

  highLight() {
    this.inputRef.current!.select();
  }

  clickRow() {
    const {
      matter,
      recycleMode = false,
      director,
      onGoToDirectory,
      onPreviewImage,
    } = this.props;
    if (director && director.isEditing()) {
      console.error("导演正忙着，不予执行");
      return;
    }

    if (matter.dir) {
      if (recycleMode) return;
      onGoToDirectory!(matter.uuid!);
    } else {
      //图片进行预览操作
      if (matter.isImage()) {
        onPreviewImage!(matter);
      } else {
        matter.preview();
      }
    }
  }

  toggleHandles() {
    this.showMore = !this.showMore;
    this.updateUI();
  }

  renderPcOperation() {
    const { matter, recycleMode = false } = this.props;

    // 文件操作在正常模式 or 回收站模式下不同，其中回收站模式只保留查看信息与彻底删除操作
    const handles = recycleMode ? (
      <>
        <Tooltip title={Lang.t("matter.recovery")}>
          <RedoOutlined
            className="btn-action"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.recoveryMatter())
            }
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.fileDetail")}>
          <InfoCircleOutlined
            className="btn-action"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(
                Sun.navigateTo("/matter/detail/" + matter.uuid)
              )
            }
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.hardDelete")}>
          <CloseCircleOutlined
            className="btn-action text-danger"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.hardDeleteMatter())
            }
          />
        </Tooltip>
      </>
    ) : (
      <>
        {!matter.dir && matter.privacy && (
          <Tooltip title={Lang.t("matter.setPublic")}>
            <UnlockOutlined
              className="btn-action"
              onClick={(e) =>
                SafeUtil.stopPropagationWrap(e)(this.changePrivacy(false))
              }
            />
          </Tooltip>
        )}
        {!matter.dir && !matter.privacy && (
          <Tooltip title={Lang.t("matter.setPrivate")}>
            <LockOutlined
              className="btn-action"
              onClick={(e) =>
                SafeUtil.stopPropagationWrap(e)(this.changePrivacy(true))
              }
            />
          </Tooltip>
        )}
        <Tooltip title={Lang.t("matter.fileDetail")}>
          <InfoCircleOutlined
            className="btn-action"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(
                Sun.navigateTo("/matter/detail/" + matter.uuid)
              )
            }
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.rename")}>
          <EditOutlined
            className="btn-action"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.prepareRename())
            }
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.copyPath")}>
          <LinkOutlined
            className="btn-action"
            onClick={(e) => SafeUtil.stopPropagationWrap(e)(this.clipboard())}
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.download")}>
          <DownloadOutlined
            className="btn-action"
            onClick={(e) => SafeUtil.stopPropagationWrap(e)(matter.download())}
          />
        </Tooltip>
        <Tooltip title={Lang.t("matter.delete")}>
          <DeleteOutlined
            className="btn-action text-danger"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.deleteMatter())
            }
          />
        </Tooltip>
      </>
    );

    return (
      <div className="right-part">
        <span className="matter-operation text-theme">{handles}</span>
        <Tooltip title={Lang.t("matter.size")}>
          <span className="matter-size">
            {StringUtil.humanFileSize(matter.size)}
          </span>
        </Tooltip>
        {recycleMode ? (
          <Tooltip title={Lang.t("matter.deleteTime")}>
            <span className="matter-date mr10">
              {DateUtil.simpleDateHourMinute(matter.deleteTime)}
            </span>
          </Tooltip>
        ) : (
          <Tooltip title={Lang.t("matter.updateTime")}>
            <span className="matter-date mr10">
              {DateUtil.simpleDateHourMinute(matter.updateTime)}
            </span>
          </Tooltip>
        )}
      </div>
    );
  }

  // 文件操作在正常模式 or 回收站模式下不同，其中回收站模式只保留查看信息与彻底删除操作
  getHandles() {
    const { matter, recycleMode = false } = this.props;
    // 回收站模式
    if (recycleMode)
      return [
        <div
          className="cell-btn navy"
          onClick={(e) =>
            SafeUtil.stopPropagationWrap(e)(
              Sun.navigateTo("/matter/detail/" + this.props.matter.uuid)
            )
          }
        >
          <InfoCircleOutlined className="btn-action mr5" />
          {Lang.t("matter.fileDetail")}
        </div>,
        <div
          className="cell-btn navy"
          onClick={(e) =>
            SafeUtil.stopPropagationWrap(e)(this.recoveryMatter())
          }
        >
          <RedoOutlined className="btn-action mr5" />
          {Lang.t("matter.recovery")}
        </div>,
        <div
          className="cell-btn text-danger"
          onClick={(e) =>
            SafeUtil.stopPropagationWrap(e)(this.hardDeleteMatter())
          }
        >
          <CloseCircleOutlined className="btn-action mr5" />
          {Lang.t("matter.hardDelete")}
        </div>,
      ];

    // 普通模式
    const handles = [];
    if (!matter.dir) {
      handles.push(
        matter.privacy ? (
          <div
            className="cell-btn navy"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.changePrivacy(false))
            }
          >
            <UnlockOutlined className="btn-action mr5" />
            {Lang.t("matter.setPublic")}
          </div>
        ) : (
          <div
            className="cell-btn navy"
            onClick={(e) =>
              SafeUtil.stopPropagationWrap(e)(this.changePrivacy(true))
            }
          >
            <LockOutlined className="btn-action mr5" />
            {Lang.t("matter.setPrivate")}
          </div>
        )
      );
    }
    handles.push(
      <div
        className="cell-btn navy"
        onClick={(e) =>
          SafeUtil.stopPropagationWrap(e)(
            Sun.navigateTo("/matter/detail/" + matter.uuid)
          )
        }
      >
        <InfoCircleOutlined className="btn-action mr5" />
        {Lang.t("matter.fileDetail")}
      </div>,
      <div
        className="cell-btn navy"
        onClick={(e) => SafeUtil.stopPropagationWrap(e)(this.prepareRename())}
      >
        <EditOutlined className="btn-action mr5" />
        {Lang.t("matter.rename")}
      </div>,
      <div
        className="cell-btn navy"
        onClick={(e) => SafeUtil.stopPropagationWrap(e)(this.clipboard())}
      >
        <LinkOutlined className="btn-action mr5" />
        {Lang.t("matter.copyLink")}
      </div>,
      <div
        className="cell-btn navy"
        onClick={(e) => SafeUtil.stopPropagationWrap(e)(matter.download())}
      >
        <DownloadOutlined className="btn-action mr5" />
        {Lang.t("matter.download")}
      </div>,
      <div
        className="cell-btn text-danger"
        onClick={(e) => SafeUtil.stopPropagationWrap(e)(this.deleteMatter())}
      >
        <DeleteOutlined className="btn-action mr5" />
        {Lang.t("matter.delete")}
      </div>
    );
    return handles;
  }

  renderMobileOperation() {
    const { matter, recycleMode = false } = this.props;

    return (
      <div className="more-panel">
        <div className="cell-btn navy text">
          <span>
            {DateUtil.simpleDateHourMinute(
              recycleMode ? matter.deleteTime : matter.updateTime
            )}
          </span>
          <span className="matter-size">
            {StringUtil.humanFileSize(matter.size)}
          </span>
        </div>
        {this.getHandles()}
      </div>
    );
  }

  render() {
    const { matter } = this.props;

    const menu = (
      <Menu>
        {this.getHandles().map((item, i) => (
          <Menu.Item key={i}>{item}</Menu.Item>
        ))}
      </Menu>
    );

    return (
      <Dropdown overlay={menu} trigger={["contextMenu"]}>
        <div className="widget-matter-panel">
          <div
            onClick={(e) => SafeUtil.stopPropagationWrap(e)(this.clickRow())}
          >
            <div className="media clearfix">
              <div className="pull-left">
                <div className="left-part">
                  <span
                    className="cell cell-hot"
                    onClick={(e) => SafeUtil.stopPropagationWrap(e)}
                  >
                    <Checkbox
                      checked={matter.check}
                      onChange={(e) => this.checkToggle(e)}
                    />
                  </span>
                  <span className="cell">
                    <img className="matter-icon" src={matter.getIcon()} />
                  </span>
                </div>
              </div>

              {/*在大屏幕下的操作栏*/}
              <div className="pull-right visible-pc">
                {matter.uuid && this.renderPcOperation()}
              </div>

              <div className="pull-right visible-mobile">
                <span
                  className="more-btn"
                  onClick={(e) =>
                    SafeUtil.stopPropagationWrap(e)(this.toggleHandles())
                  }
                >
                  <EllipsisOutlined className="btn-action navy f18" />
                </span>
              </div>

              <div className="media-body">
                <div className="middle-part">
                  {matter.editMode ? (
                    <span className="matter-name-edit">
                      <input
                        ref={this.inputRef}
                        className={matter.uuid!}
                        value={this.renameMatterName}
                        onChange={(e) => this.changeMatterName(e)}
                        placeholder={Lang.t("matter.enterName")}
                        onBlur={() => this.blurTrigger()}
                        onKeyUp={(e) => this.enterTrigger(e)}
                      />
                    </span>
                  ) : (
                    <Space size={20}>
                      <span className="matter-name">
                        {matter.name}
                        {!matter.dir && !matter.privacy && (
                          <Tooltip
                            title={Lang.t("matter.publicFileEveryoneCanVisit")}
                          >
                            <UnlockOutlined className="icon" />
                          </Tooltip>
                        )}
                      </span>
                      <span style={{ color: "gray" }}>
                        {matter.note ? `${Lang.t("matter.note")}: ${matter.note}` : ""}
                      </span>

                    </Space>

                  )}
                </div>
              </div>
            </div>
          </div>

          <Expanding>
            {this.showMore ? this.renderMobileOperation() : null}
          </Expanding>
        </div>
      </Dropdown>
    );
  }
}
