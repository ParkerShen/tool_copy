// src/pages/UserManagement/components/UserForm.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Switch, Upload, Spin, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { UserFormProps } from '../roletypes';
import { getRoleList, uploadsImage } from '@/services/platform/api';

const { Option } = Select;

const UserForm: React.FC<UserFormProps> = ({
  visible,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [form] = Form.useForm();

  const [roleOptions, setRoleOptions] = useState<any>([]);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // 获取角色列表
  const fetchRoles = async () => {
    setFetchingRoles(true);
    try {
      const response = await getRoleList();
      if (response.success && response.data) {
        setRoleOptions(response.data);
      } else {
        console.error('获取角色列表失败:', response.message);
      }
    } catch (error) {
      console.error('获取角色列表错误:', error);
    } finally {
      setFetchingRoles(false);
    }
  };

  useEffect(() => {
    form.resetFields();
    if (initialValues) {
      const formValues = {
        ...initialValues,
        // 将 Roles 数组转换为角色 ID 数组
        roles: initialValues.Roles?.map((role) => role.roleId) || [],
      };
      console.log('🚀 ~ useEffect ~ formValues:', formValues);

      form.setFieldsValue(formValues);
      setImageUrl(initialValues.avatar || null);
    } else {
      setImageUrl(null);
    }
  }, [initialValues]);

  useEffect(() => {
    if (visible) {
      fetchRoles();
    }
  }, [visible]);

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();

      values.avatar = imageUrl || values.avatar; // 确保头像字段有值
      onSubmit(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 自定义上传函数
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('category', 'avatar');

      const response = await uploadsImage(formData);

      if (response.success) {
        // 更新图片 URL 状
        setImageUrl(response.data);
        // 设置表单字段值
        form.setFieldsValue({ avatar: response.data });
        onSuccess(response, file);
        message.success('头像上传成功');
      } else {
        onError(new Error(response.message || '上传失败'), file);
        message.error(response.message || '上传失败');
      }
    } catch (error: any) {
      onError(error, file);
      message.error(`上传失败: ${error.message || '服务器错误'}`);
    } finally {
      setUploading(false);
    }
  };

  // 上传前验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
    }

    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('图片大小不能超过 5MB!');
    }

    return isImage && isLt5M;
  };

  return (
    <Modal
      title={`${mode === 'create' ? '创建' : '编辑'}用户`}
      open={visible}
      onOk={handleFinish}
      onCancel={onCancel}
      destroyOnClose
      confirmLoading={loading}
    >
      <Spin spinning={fetchingRoles}>
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{
            status: 1,
            isAdmin: 0,
            roles: [],
          }}
        >
          {mode === 'edit' && (
            <Form.Item name="userId" hidden>
              <Input type="hidden" />
            </Form.Item>
          )}
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          >
            <Input placeholder="请输入用户名" disabled={mode === 'edit'} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              () => ({
                validator(_, value) {
                  if (!value) return Promise.resolve();

                  // 正则解释:
                  // ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$
                  // - 至少1个小写字母: (?=.*[a-z])
                  // - 至少1个大写字母: (?=.*[A-Z])
                  // - 至少1个数字:    (?=.*\d)
                  // - 只能字母数字:   [a-zA-Z\d]
                  // - 最小8位:       {8,}
                  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

                  if (!passwordRegex.test(value)) {
                    return Promise.reject(
                      new Error('密码需8位以上，包含大小写字母和数字，不能有特殊字符'),
                    );
                  }

                  return Promise.resolve();
                },
              }),
            ]}
          >
            <Input.Password placeholder="请输入密码，不填则默认123456" />
          </Form.Item>

          {/* <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input placeholder="请输入邮箱" />
        </Form.Item>
        
        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item> */}

          <Form.Item name="roles" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select mode="multiple" placeholder="请选择角色">
              {roleOptions.map((role: any) => (
                <Option key={role.id} value={role.id}>
                  {role.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item label="头像" name="avatar">
            <Upload
              name="file"
              listType="picture-card"
              showUploadList={false}
              customRequest={customUpload}
              beforeUpload={beforeUpload}
              disabled={uploading}
            >
              {imageUrl ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={process.env.UMI_APP_IMAGE_API_BASE_URL + imageUrl}
                    alt="avatar"
                    style={{ width: '100%', maxHeight: '100px' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      padding: '2px 5px',
                      fontSize: '12px',
                    }}
                  >
                    点击更换
                  </div>
                </div>
              ) : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传头像</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default UserForm;
