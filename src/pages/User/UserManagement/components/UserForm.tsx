// src/pages/UserManagement/components/UserForm.tsx
import React, { useEffect } from 'react';
import { Modal, Form, Input } from 'antd';
import { UserFormProps } from '../userTypes';

const UserForm: React.FC<UserFormProps> = ({ 
  visible, 
  mode, 
  initialValues, 
  onSubmit, 
  onCancel 
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    form.resetFields();
    if (initialValues) form.setFieldsValue(initialValues);
  }, [initialValues, visible]);

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <Modal
      title={`${mode === 'create' ? '创建' : '编辑'}用户`}
      open={visible}
      onOk={handleFinish}
      onCancel={onCancel}
      destroyOnClose
    >
      <Form 
        form={form} 
        layout="vertical"
        preserve={false}
      >
        {mode === 'edit' && (
          <Form.Item name="id" hidden>
            <Input type="hidden" />
          </Form.Item>
        )}
        
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ 
            required: true, 
            message: '请输入姓名' 
          }]}
        >
          <Input placeholder="请输入用户姓名" />
        </Form.Item>
        
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input placeholder="请输入用户邮箱" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UserForm;