import { Controller } from '@nestjs/common';
import { SubCategoryService } from './sub-category.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags("Sub Category")
@Controller('sub-category')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}
}
