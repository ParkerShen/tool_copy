import React, { useEffect, useState } from 'react';
import { Form, Input, Switch, Tree, Card, Button } from 'antd';
import { FuzzyRoleFormProps } from '../roletypes';
const { TextArea } = Input;

const FuzzyRoleForm: React.FC<FuzzyRoleFormProps> = ({
  visible,
  onCancel,
  mode,
  treeData,
  initialValues,
  onSubmit,
}) => {
  const [form] = Form.useForm();

  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  useEffect(() => {
    form.resetFields();
    // 确保initialValues存在且permissions有效
    const safePermissions = initialValues?.permissions?.filter(Boolean) || [];

    setCheckedKeys(safePermissions);

    // 安全设置表单值
    if (initialValues) {
      form.setFieldsValue({ ...initialValues });
    }
  }, [initialValues, form]);

  const onCheck = (checkedKeysValue: { halfChecked: string[]; checked: never[] }) => {
    setCheckedKeys(checkedKeysValue.checked);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('🚀 ~ handleSubmit ~ values:', {
        ...values,
        accesss: checkedKeys,
      });
      onSubmit({
        ...values,
        accesss: checkedKeys,
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return visible ? (
    <Card title={`${mode === 'create' ? '创建' : '编辑'}角色`} bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          name: '',
          description: '',
          status: 1,
        }}
      >
        {mode === 'edit' && (
          <Form.Item name="roleId" hidden>
            <Input type="hidden" />
          </Form.Item>
        )}
        <Form.Item
          label="角色名称"
          name="name"
          rules={[{ required: true, message: '请输入角色名称' }]}
        >
          <Input placeholder="请输入角色名称" />
        </Form.Item>

        <Form.Item label="角色描述" name="description">
          <TextArea rows={3} placeholder="请输入角色描述" />
        </Form.Item>

        <Form.Item
          label="启用状态"
          name="status"
          valuePropName="checked"
          getValueFromEvent={(checked) => (checked ? 1 : 0)}
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" defaultChecked />
        </Form.Item>

        <Form.Item label="权限配置" required>
          <Tree
            defaultExpandAll
            checkable
            selectable={false}
            // onExpand={onExpand}
            autoExpandParent
            onCheck={onCheck as any}
            checkedKeys={checkedKeys}
            checkStrictly
            treeData={treeData as any}
            height={300}
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              padding: '12px',
            }}
          />
        </Form.Item>
        <Form.Item>
          <Button size="large" onClick={onCancel} style={{ width: '120px', marginRight: '20px' }}>
            关闭
          </Button>
          <Button size="large" color="primary" style={{ width: '120px' }} onClick={handleSubmit}>
            提交
          </Button>
        </Form.Item>
      </Form>
    </Card>
  ) : null;
};

export default FuzzyRoleForm;
