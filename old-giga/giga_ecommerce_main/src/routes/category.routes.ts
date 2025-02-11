import { Router } from 'express';
import CategoryController from '../controllers/category.controller';
import { getAllEndpointsHandler } from '../utils/endpointsUtil';

const router = Router();
const allEndpointsHandler = getAllEndpointsHandler(router);

router.get('/all-endpoints', allEndpointsHandler);
router.get('/', CategoryController.getAll);
router.post('/', CategoryController.create);
router.get('/products', CategoryController.getAllProducts);
router.get('/subcategories', CategoryController.getAllSubCategories);
router.delete('/:categoryId', CategoryController.deleteOne);
router.delete('/', CategoryController.deleteMultiple);
router.put('/:categoryId', CategoryController.update);
router.put('/addsubcategory/:categoryId', CategoryController.addSubCategory);
router.put('/removesubcategory/:categoryId', CategoryController.removeSubCategory);

export default router;