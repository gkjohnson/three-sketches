import { BufferGeometry, BufferAttribute, LineSegments, Vector3 } from 'three';

const _vec = new Vector3();
export class InstancedTrails extends LineSegments {

    constructor( trailCount, segmentCount, material ) {

        const geometry = new BufferGeometry();
        const posArr = new Float32Array( trailCount * segmentCount * 2 * 3 );
        geometry.setAttribute( 'position', new BufferAttribute( posArr, 3, false ) );
        geometry.setAttribute( 'lifeIndex', new BufferAttribute( new Uint32Array( trailCount * segmentCount * 2 ), 1, false ) );

        super( geometry, material );

        this.segmentCount = segmentCount;
        this.nextSegment = new Uint16Array( trailCount );

    }

    _setSegment( index, segment, start, end ) {

        const { segmentCount, geometry } = this;
        const { position } = geometry.attributes;

        const offset = index * segmentCount * 2;
        position.setXYZ( offset + segment * 2 + 0, start.x, start.y, start.z );
        position.setXYZ( offset + segment * 2 + 1, end.x, end.y, end.z );

    }

    _setSegmentLife( index, segment, value ) {

        const { segmentCount, geometry } = this;
        const { lifeIndex } = geometry.attributes;

        const offset = index * segmentCount * 2;
        lifeIndex.setX( offset + segment * 2 + 0, value );
        lifeIndex.setX( offset + segment * 2 + 1, value );

    }

    init( index, v ) {

        const { segmentCount, geometry } = this;
        const { position } = geometry.attributes;

        for ( let i = 0; i < segmentCount; i ++ ) {

            this._setSegment( index, i, v, v );

        }

        position.needsUpdate = true;

    }

    pushPoint( index, v, breakTrail = false ) {

        const nextSeg = this.nextSegment[ index ];
        let prevSeg = nextSeg - 1;
        if ( prevSeg < 0 ) {

            prevSeg = this.segmentCount - 1;

        }

        const { geometry, segmentCount } = this;
        const { position, lifeIndex } = geometry.attributes;
        const prevLife = lifeIndex.getX( index * segmentCount * 2 + prevSeg * 2 );
        _vec.fromBufferAttribute( position, index * segmentCount * 2 + prevSeg * 2 + 1 );

        if ( breakTrail ) {

            this._setSegment( index, nextSeg, v, v );
            this._setSegmentLife( index, nextSeg, prevLife + 1 );

        } else {

            this._setSegment( index, nextSeg, _vec, v );
            this._setSegmentLife( index, nextSeg, prevLife + 1 );

        }

        this.nextSegment[ index ] = ( this.nextSegment[ index ] + 1 ) % this.segmentCount;
        position.needsUpdate = true;
        lifeIndex.needsUpdate = true;

    }

}
