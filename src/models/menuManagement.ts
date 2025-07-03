import { useState } from 'react';
import { message } from 'antd';
import {
  getPermissionList,
} from '@/services/platform/api';
export default () => {
  const [treeData, setTreeData] = useState([]);
  const [currentNode, setCurrentNode] = useState<API.PermissionMenu | null>();
  

    const loadData = async () => {
    
      try {
        // 传递查询参数到后端
        const res = await getPermissionList();
        if (res.success && res.data) {
            setTreeData(res.data);
        } else {
          message.error(res.message || '获取失败');
        }
      } catch (error) {
        message.error('获失败');
      }
    };


  const removeNode = (nodeId: number) => {
    // 深度优先遍历删除节点
    const removeNodeRecursive = (data: any, id: number) => {
      return data.filter((item: any) => {
        if (item.id === id) {
          return false; // 删除当前节点
        }
        if (item.children) {
          item.children = removeNodeRecursive(item.children, id);
        }
        return true;
      });
    };
    
    const newTreeData = removeNodeRecursive([...treeData], nodeId);
    setTreeData(newTreeData);
    
    // 如果删除的是当前选中的节点，清空选中状态
    if (currentNode && currentNode.id === nodeId) {
      setCurrentNode(null);
    }
    
    return newTreeData;
  };

  return {
    treeData,
    currentNode,
    setCurrentNode,
    removeNode,
    loadData,
  };
}