import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Tree, Form, Input, Button, Select, message, Modal } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from 'umi';
import { DeleteOutlined } from '@ant-design/icons';
import {
    createPermission,
    updatePermission,
    deletePermission,
} from '@/services/platform/api';
const MenuManagement: React.FC = () => {
    const { treeData, currentNode, setCurrentNode, loadData } = useModel('menuManagement');
    const [form] = Form.useForm();
    const [formType, setFormType] = useState<number>(0);
    const [parentNode, setParentNode] = useState<any>(null); // 新增：用于记录父节点
    const [isEditMode, setIsEditMode] = useState<boolean>(false); // 新增：区分编辑/添加模式

    useEffect(() => {
        loadData();
    }, []);

    const renderTreeNode = (nodeData) => {
        return (
            <div className="tree-node-content" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{nodeData.title}</span>
                <Button
                    type="link"
                    size="small"
                    danger
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(nodeData);
                    }}
                >
                    <DeleteOutlined />
                </Button>
            </div>
        );
    };

    // 处理节点删除
    const handleDeleteNode = (node: API.PermissionMenu) => {
        // 检查是否有子节点
        if (node.children && node.children.length > 0) {
            message.error('请先删除所有子节点！');
            return;
        }

        Modal.confirm({
            title: `确认删除 ${node.title}?`,
            content: '此操作不可恢复',
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                const res = await deletePermission(node.permissionId)
                if (res.success) {
                    message.success(res.message)
                    loadData();
                } else {
                    message.error(res.message)
                }
            }
        });
    };


    // 当选中节点变化时更新表单和表单类型
    useEffect(() => {
        if (isEditMode && currentNode) {
            // 编辑模式：显示当前节点信息
            const type = currentNode.type ?? 0;
            setFormType(type);

            form.setFieldsValue({
                title: currentNode.title,
                name: currentNode.name,
                type: type,
                path: currentNode.path,
                component: currentNode.component,
                orderNum: currentNode.orderNum,
                access: currentNode.access,
                permissionId: currentNode.permissionId,
                description: currentNode.description
            });
        } else if (parentNode) {
            // 添加子节点模式：准备添加子节点
            const newType = parentNode.type === 0 ? 1 : 2; // 一级节点下添加菜单，二级节点下添加按钮
            setFormType(newType);

            form.resetFields();
            form.setFieldsValue({
                type: newType
            });
        } else {
            // 添加一级目录
            setFormType(0);
            form.resetFields();
        }
    }, [currentNode, parentNode, isEditMode]);

    // 处理树节点选择
    const handleSelect = (selectedKeys, { node }) => {
        // 点击节点时进入编辑模式
        setParentNode(null);
        setIsEditMode(true);
        setCurrentNode({
            ...node,
            type: node.type,
            name: node.name,
            title: node.title,
            pid: node.pid,
            orderNum: node.orderNum,
            permissionId: node.permissionId,
            description: node.description
        });
    };

    // 添加子节点按钮处理
    const handleAddChild = () => {
        if (currentNode) {
            setIsEditMode(false);
            setParentNode(currentNode);
        }
    };

    // 添加一级目录按钮处理
    const handleAddRoot = () => {
        setIsEditMode(false);
        setParentNode(null);
        setCurrentNode(null);
    };

    // 提交表单（创建/更新权限）
    const handleSubmit = async (values: API.PermissionMenu) => {
        let pid = 0;
        let type = values.type;
        // 添加继承字段的变量
        let inheritedPath = '';
        let inheritedName = '';
        let inheritedComponent = '';
    
        if (parentNode) {
            // 添加子节点
            pid = parentNode.permissionId;
            
            // 如果是添加按钮权限，继承父节点的 path、name 和 component
            if (type === 2) {
                inheritedPath = parentNode.path || '';
                inheritedName = parentNode.name || '';
                inheritedComponent = parentNode.component || '';
            }
        } else if (currentNode && isEditMode) {
            // 编辑现有节点
            pid = currentNode.pid;
        } else {
            // 添加一级目录
            pid = 0;
            type = 0;
        }
    
        const newPermission = {
            ...values,
            pid,
            type,
            // 如果是添加按钮权限，使用继承的字段值
            ...(type === 2 && !isEditMode && {
                path: inheritedPath,
                name: inheritedName,
                component: inheritedComponent
            })
        };
        try {
            if (!isEditMode) {
                const res = await createPermission(newPermission);
                if (res.success) {
                    message.success('权限创建成功');
                    form.resetFields();
                    setCurrentNode(null);
                    setParentNode(null);
                    setIsEditMode(false);
                    loadData();
                } else {
                    message.error(res.message);
                }
            } else {
                const res = await updatePermission(newPermission);
                if (res.success) {
                    message.success('权限更新成功');
                    form.resetFields();
                    setCurrentNode(null);
                    setParentNode(null);
                    setIsEditMode(false);
                    loadData();
                } else {
                    message.error(res.message);
                }
            }
        } catch (error) {
            message.error('操作失败');
        }
    };

    // 获取表单标题
    const getFormTitle = () => {
        if (!currentNode && !parentNode) return '添加一级目录'
        if (parentNode) {
            return parentNode.type === 0
                ? '添加二级菜单---' + currentNode.title
                : '添加按钮权限---' + currentNode.title;
        }
        return '编辑权限';
    };


    // 获取当前权限类型的文本
    const getPermissionText = (type: number) => {
        switch (type) {
            case 0: return '目录';
            case 1: return '菜单';
            case 2: return '权限';
            default: return '权限';
        }
    };

    // 获取按钮文本
    const getButtonText = () => {
        if (parentNode || (!currentNode && !parentNode)) {
            return `创建${getPermissionText(formType)}`;
        }
        return `更新${getPermissionText(formType)}`;
    };

    return (
        <PageContainer extra={ isEditMode && (
            <div>
                {currentNode?.type === 0 && (
                    <Button
                        type="primary"

                        onClick={handleAddChild}
                        style={{ marginRight: 8 }}
                    >
                        添加二级菜单
                    </Button>
                )}
                {currentNode?.type === 1 && (
                    <Button
                        type="primary"
                        onClick={handleAddChild}
                    >
                        添加按钮权限
                    </Button>
                )}
            </div>
        )
    }>
            
            <Row gutter={24}>
                <Col span={8}>
                    <Card
                        title="权限结构"

                        extra={
                            <Button type="link" onClick={handleAddRoot}>
                                添加一级目录
                            </Button>
                        }
                    >
                         
                        <Tree
                            treeData={treeData}
                            defaultExpandAll
                            autoExpandParent
                            fieldNames={{ title: 'title', key: 'id', children: 'children' }}
                            onSelect={handleSelect}
                            selectedKeys={currentNode ? [currentNode.id] : []}
                            titleRender={renderTreeNode}
                        />
                    </Card>
                </Col>

                <Col span={16}>
                    <Card title={getFormTitle()}>
                        
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSubmit}
                            initialValues={{ type: 0 }}
                        >
                            {isEditMode && (
                                <Form.Item name="permissionId" hidden>
                                    <Input type="hidden" />
                                </Form.Item>
                            )}
                            <Form.Item name="type" hidden>
                                <Input type="hidden" />
                            </Form.Item>

                            <Form.Item
                                label={`${getPermissionText(formType)}名称`}
                                name="title"
                                rules={[{ required: true, message: '请输入名称' }]}
                            >
                                <Input placeholder="例如：用户管理" />
                            </Form.Item>
                            {formType !== 2 && (
                                <Form.Item
                                    label="页面名称"
                                    name="name"
                                    rules={[{ required: formType !== 2, message: '请输入页面名称' }]}
                                >
                                    <Input placeholder="例如: 目录admin 菜单 admin:user-page" />
                                </Form.Item>
                            )}

                            {/* 编辑模式下显示类型文本 */}

                            <Form.Item label="权限类型">
                                <div style={{ padding: '4px 11px' }}>
                                    {formType === 0 ? '一级目录' :
                                        formType === 1 ? '二级菜单' : '按钮权限'}
                                </div>
                            </Form.Item>
                            <Form.Item label="描述" name="description">
                            <Input placeholder="" />
                            </Form.Item>
                            {formType !== 2 && (
                                <>
                                    <Form.Item
                                        label="路由路径"
                                        name="path"
                                        rules={[{ required: formType !== 2, message: '请输入路由路径' }]}
                                    >
                                        <Input placeholder="例如：/admin/user-page" />
                                    </Form.Item>

                                    <Form.Item
                                        label="组件路径"
                                        name="component"
                                        rules={[{ required: formType !== 2, message: '请输入组件路径' }]}
                                    >
                                        <Input placeholder="例如：./user/UserManagement" />
                                    </Form.Item>
                                </>
                            )}

                            <Form.Item
                                label="排序"
                                name="orderNum"
                                rules={[{ required: true, message: '请输入排序' }]}
                            >
                                <Input type="number" />
                            </Form.Item>

                            <Form.Item
                                label="权限标记"
                                name="access"
                                rules={[{ required: true, message: '请输入标记' }]}
                            >
                                <Input placeholder="例如：目录:admin 菜单:admin:user-page 权限:admin:user-page:view" />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    {getButtonText()}
                                </Button>

                                {(isEditMode || parentNode) && (
                                    <Button
                                        style={{ marginLeft: 8 }}
                                        onClick={() => {
                                            setCurrentNode(null);
                                            setParentNode(null);
                                            setIsEditMode(false);
                                        }}
                                    >
                                        取消
                                    </Button>
                                )}
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>
            </Row>
       
        </PageContainer>
    );
};

export default MenuManagement;