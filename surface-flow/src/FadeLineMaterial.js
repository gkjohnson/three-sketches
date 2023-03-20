import { Color } from 'three';
import { MaterialBase } from '../../common/MaterialBase.js';

export class FadeLineMaterial extends MaterialBase {

	constructor( params ) {

		super( {

			uniforms: {

				color: { value: new Color() },
				opacity: { value: 1 },
				currIndex: { value: 10 },
				segmentCount: { value: 10 },

			},

			vertexShader: /* glsl */`

                attribute uint lifeIndex;
                varying float vLifeIndex;
                void main() {

                    vec4 mvPosition = vec4( position, 1.0 );
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;
                    vLifeIndex = float( lifeIndex );

                }

            `,

			fragmentShader: /* glsl */`

                uniform vec3 color;
                uniform float opacity;
                uniform float currIndex;
                uniform float segmentCount;
                varying float vLifeIndex;

                void main() {

                    float currValue = vLifeIndex - ( currIndex - segmentCount );

                    gl_FragColor.rgb = color;
                    gl_FragColor.a = opacity * max( currValue / segmentCount, 0.0 );

                    #include <encodings_fragment>

                }

            `,

		} );

		this.setValues( params );

	}

}
