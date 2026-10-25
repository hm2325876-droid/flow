import {startUtility} from '../src/utility/runtime';
import {resolveModel} from '@flowproof/ai-providers';
import {nativeTestModel} from './agent-test-model';
startUtility(((selection)=>nativeTestModel(selection.modelId)) as typeof resolveModel);
