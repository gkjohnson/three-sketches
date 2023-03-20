import { InstancedMesh, Matrix4, SphereGeometry, Vector3 } from 'three';

const _mat = new Matrix4().identity();
const _vec = new Vector3();
export class InstancedSpheres extends InstancedMesh {

    constructor( material, count ) {

        super( new SphereGeometry(), material, count );

    }

    setPosition( index, v, scale = 1.0 ) {

        _vec.setScalar( scale );
        _mat.makeTranslation( ...v ).scale( _vec );
        this.setMatrixAt( index, _mat );
        this.instanceMatrix.needsUpdate = true;

    }

}